import { theme } from '@actual-app/components/theme';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  balanceTypeOpType,
  BaselineBreakdown,
  CustomReportBaselineSortAmount,
  DataEntity,
  GroupedEntity,
  IntervalEntity,
  LegendEntity,
  ReportValues,
  sortByOpType,
} from '@actual-app/core/types/models';

import {
  countDays,
  countElapsedDays,
  countElapsedMonths,
  countMonths,
  getAmountKey,
  getBaselineKey,
  getChangeKey,
  getFullIntervalDays,
  getFullIntervalMonths,
  getFullIntervalRange,
  shiftRange,
} from '#components/reports/baselineRange';
import { ReportOptions } from '#components/reports/ReportOptions';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';

import { calculateLegend } from './calculateLegend';
import { createCustomSpreadsheet } from './custom-spreadsheet';
import type { createCustomSpreadsheetProps } from './custom-spreadsheet';
import { filterEmptyRows } from './filterEmptyRows';
import { createGroupedSpreadsheet } from './grouped-spreadsheet';
import { sortData } from './sortData';
import {
  determineIntervalRange,
  trimIntervalDataToRange,
} from './trimIntervals';

type Spreadsheet = ReturnType<typeof useSpreadsheet>;

type SpreadsheetFn<T> = (
  spreadsheet: Spreadsheet,
  setData: (data: T) => void,
) => Promise<void>;

type AdditiveField =
  | 'totalAssets'
  | 'totalDebts'
  | 'totalTotals'
  | 'totalBudgeted';

type OffsetItem = ReportValues & { intervalData: IntervalEntity[] };

export type BaselineOptions = {
  startDate: string;
  endDate: string;
  projectToFullPeriod: boolean;
  // Graphs draw amounts against the baseline rather than changes, so rows
  // sort by amount and intervals carry each series' amount and baseline
  showAmounts?: boolean;
  // The amount rows sort by. Without it, rows sort by the current amount.
  sortAmount?: CustomReportBaselineSortAmount;
  // Compare against the average of what was budgeted over the range, rather
  // than what was spent
  budgeted?: boolean;
  // Compare each interval with its own window this many days back, rather
  // than with the range's average. The range is then the report's range
  // moved back by the offset.
  offset?: BaselineOffset;
};

export type BaselineOffset = {
  days: number;
  // Windows that end before this have nothing to compare against
  earliestTransaction: string;
};

// How baseline totals map onto the report's intervals
export type BaselineScale = {
  // The baseline's length in its unit. Spending accrues per day, and budgets
  // are set per month, so a budgeted baseline is spread by months.
  baselineLength: number;
  budgeted: boolean;
  baselineIntervals: number;
  // Budgets are set per interval rather than accrued per day
  perInterval: boolean;
  projectToFullPeriod: boolean;
  // Average full length of the displayed intervals in days, for the pace of
  // actual amounts
  averageDays: number;
  // The same in the baseline's unit, for the Baseline column
  averageLength: number;
  // With an offset baseline: the offset, and the interval the baseline was
  // fetched by, which windows are summed from
  offset?: BaselineOffset & { bucketInterval: string };
};

// How much of the baseline a range gets, in the baseline's unit
function measure(scale: BaselineScale, start: string, end: string) {
  return scale.budgeted ? countMonths(start, end) : countDays(start, end);
}

function measureElapsed(scale: BaselineScale, start: string, end: string) {
  return scale.budgeted
    ? countElapsedMonths(start, end)
    : countElapsedDays(start, end);
}

type BaselineContext = {
  scale: BaselineScale;
  template: IntervalEntity[];
  showEmpty: boolean;
  balanceTypeOp: balanceTypeOpType;
  sortByOp: sortByOpType;
  sortAmount: CustomReportBaselineSortAmount;
};

// Amounts are drawn like other report graphs, with spending pointing up
function getAmountSign(balanceTypeOp: balanceTypeOpType) {
  return balanceTypeOp === 'totalDebts' || balanceTypeOp === 'netDebts'
    ? -1
    : 1;
}

function mapValues(getValue: (field: balanceTypeOpType) => number) {
  return {
    totalAssets: getValue('totalAssets'),
    totalDebts: getValue('totalDebts'),
    totalTotals: getValue('totalTotals'),
    netAssets: getValue('netAssets'),
    netDebts: getValue('netDebts'),
    totalBudgeted: getValue('totalBudgeted'),
  } satisfies ReportValues;
}

// Net fields are derived from the total, as the report spreadsheets do
function fromTotals(getValue: (field: AdditiveField) => number): ReportValues {
  const totalTotals = getValue('totalTotals');
  return {
    totalAssets: getValue('totalAssets'),
    totalDebts: getValue('totalDebts'),
    totalTotals,
    netAssets: totalTotals > 0 ? totalTotals : 0,
    netDebts: totalTotals < 0 ? totalTotals : 0,
    totalBudgeted: getValue('totalBudgeted'),
  };
}

function subtract(a: ReportValues, b: ReportValues): ReportValues {
  return mapValues(field => a[field] - b[field]);
}

function laterOf(a: string, b: string) {
  return a > b ? a : b;
}

function earlierOf(a: string, b: string) {
  return a < b ? a : b;
}

// Buckets are in date order, so the first one a window reaches is found by
// a binary search on where each bucket ends
function findFirstBucket(
  buckets: IntervalEntity[],
  interval: string,
  start: string,
) {
  let low = 0;
  let high = buckets.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const bucketStart = buckets[middle].intervalStartDate;
    if (bucketStart && getFullIntervalRange(bucketStart, interval)[1] < start) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/**
 * The baseline's total over a window, from the intervals it was fetched by.
 * A bucket the window only partly covers counts by its share of days, so
 * days sum exactly and a month of budgets is spread over its days.
 */
export function sumWindow(
  buckets: IntervalEntity[],
  interval: string,
  start: string,
  end: string,
): ReportValues {
  const totals = mapValues(() => 0);
  for (
    let index = findFirstBucket(buckets, interval, start);
    index < buckets.length;
    index++
  ) {
    const bucket = buckets[index];
    if (!bucket.intervalStartDate) {
      continue;
    }
    const [bucketStart, bucketEnd] = getFullIntervalRange(
      bucket.intervalStartDate,
      interval,
    );
    if (bucketStart > end) {
      break;
    }
    const share =
      countDays(laterOf(start, bucketStart), earlierOf(end, bucketEnd)) /
      countDays(bucketStart, bucketEnd);
    for (const field of Object.keys(totals) as balanceTypeOpType[]) {
      totals[field] += bucket[field] * share;
    }
  }
  return fromTotals(field => Math.round(totals[field]));
}

/**
 * Offsets one interval by its own window an offset back. An interval in
 * progress is compared with the same days of its window.
 */
function offsetIntervalByWindow(
  interval: IntervalEntity,
  start: string,
  end: string,
  baseline: OffsetItem | undefined,
  scale: BaselineScale,
  offset: NonNullable<BaselineScale['offset']>,
): IntervalEntity {
  const [windowStart, windowEnd] = shiftRange(start, end, offset.days);
  const window = { baselineStartDate: windowStart, baselineEndDate: windowEnd };
  const sum = (from: string, to: string) =>
    sumWindow(baseline?.intervalData ?? [], offset.bucketInterval, from, to);
  const zero = mapValues(() => 0);
  const actual = fromTotals(field => interval[field]);

  if (windowEnd < offset.earliestTransaction) {
    return {
      ...interval,
      ...window,
      ...zero,
      baseline: {
        expected: zero,
        actual,
        budgeted: scale.budgeted,
        noData: true,
      },
    };
  }

  // The window's amounts are known even ahead of today, so charts can always
  // draw them for intervals that haven't started
  if (!scale.perInterval && isFuture(start)) {
    return {
      ...interval,
      ...window,
      ...zero,
      baseline: {
        expected: zero,
        actual: zero,
        upcoming: sum(windowStart, windowEnd),
        budgeted: scale.budgeted,
      },
    };
  }

  const elapsedEnd = scale.perInterval
    ? end
    : earlierOf(end, monthUtils.currentDay());
  const expected = sum(
    windowStart,
    shiftRange(start, elapsedEnd, offset.days)[1],
  );
  return {
    ...interval,
    ...window,
    ...subtract(actual, expected),
    baseline: { expected, actual, budgeted: scale.budgeted },
  };
}

/**
 * Offsets one interval by the baseline's average over the same length, or
 * by its own window with an offset baseline.
 */
export function offsetInterval(
  interval: IntervalEntity,
  baseline: OffsetItem | undefined,
  scale: BaselineScale,
): IntervalEntity {
  const start = interval.intervalStartDate;
  const end = interval.intervalEndDate ?? start;
  // Report spreadsheets always date their intervals; without dates there's
  // no length to scale the baseline by
  if (!start || !end) {
    return interval;
  }

  if (scale.offset) {
    return offsetIntervalByWindow(
      interval,
      monthUtils.dayFromDate(start),
      monthUtils.dayFromDate(end),
      baseline,
      scale,
      scale.offset,
    );
  }

  // Intervals that haven't started have nothing to compare yet, so they stay
  // empty rather than showing the whole baseline as a change. Budgets are set
  // ahead of time, so theirs are still compared.
  if (!scale.perInterval && isFuture(start)) {
    const zero = mapValues(() => 0);
    // Charts only draw the baseline ahead when the amount is projected there
    const length = measure(scale, start, end);
    const upcoming = scale.projectToFullPeriod
      ? fromTotals(field =>
          Math.round(
            ((baseline?.[field] ?? 0) * length) / scale.baselineLength,
          ),
        )
      : undefined;
    return {
      ...interval,
      ...zero,
      baseline: {
        expected: zero,
        actual: zero,
        upcoming,
        budgeted: scale.budgeted,
      },
    };
  }

  // An interval in progress is compared against the baseline over the days
  // that have passed. Projecting from its first few days is too unreliable,
  // so projections only cover the whole range.
  const share = scale.perInterval
    ? 1 / scale.baselineIntervals
    : measureElapsed(scale, start, end) / scale.baselineLength;

  const expected = fromTotals(field =>
    Math.round((baseline?.[field] ?? 0) * share),
  );
  const actual = fromTotals(field => interval[field]);

  return {
    ...interval,
    ...subtract(actual, expected),
    baseline: { expected, actual, budgeted: scale.budgeted },
  };
}

function isFuture(date: string) {
  return monthUtils.dayFromDate(date) > monthUtils.currentDay();
}

// The whole range a row's intervals cover, for projecting its total
function getProjection(intervals: IntervalEntity[], scale: BaselineScale) {
  const start = intervals[0]?.intervalStartDate;
  const end = intervals[intervals.length - 1]?.intervalEndDate;
  if (!scale.projectToFullPeriod || scale.perInterval || !start || !end) {
    return null;
  }

  const days = countDays(start, end);
  const elapsedDays = countElapsedDays(start, end);
  return days > elapsedDays
    ? { length: measure(scale, start, end), scale: days / elapsedDays }
    : null;
}

// Scales a row's amount so far to an average-length interval, using its daily
// pace over the days that have passed. Budgets are set per interval instead.
function getPaceShare(intervals: IntervalEntity[], scale: BaselineScale) {
  const start = intervals[0]?.intervalStartDate;
  const end = intervals[intervals.length - 1]?.intervalEndDate;
  if (scale.perInterval || !start || !end) {
    return 1 / Math.max(intervals.length, 1);
  }
  return scale.averageDays / countElapsedDays(start, end);
}

/**
 * Offsets a row or the report totals. Without a projection, item values are
 * summed from the offset intervals so table columns add up. With one, the
 * total is spending so far scaled to the whole range, compared against the
 * baseline over the whole range, which includes intervals that haven't
 * started.
 */
export function offsetItem<T extends OffsetItem>(
  item: T,
  baseline: OffsetItem | undefined,
  scale: BaselineScale,
): T & { baseline: BaselineBreakdown } {
  const intervalData = item.intervalData.map(interval =>
    offsetInterval(interval, baseline, scale),
  );
  if (scale.offset) {
    return offsetItemByWindows(
      item,
      intervalData,
      baseline,
      scale,
      scale.offset,
    );
  }
  const sum = (
    pick: (breakdown: BaselineBreakdown) => ReportValues | undefined,
  ) =>
    fromTotals(field =>
      intervalData.reduce(
        (total, interval) =>
          total +
          (interval.baseline
            ? (pick(interval.baseline) ?? interval.baseline.actual)[field]
            : 0),
        0,
      ),
    );

  const actual = sum(breakdown => breakdown.actual);
  const projection = getProjection(item.intervalData, scale);
  const expected = projection
    ? fromTotals(field =>
        Math.round(
          ((baseline?.[field] ?? 0) * projection.length) / scale.baselineLength,
        ),
      )
    : sum(breakdown => breakdown.expected);
  const projected = projection
    ? fromTotals(field => Math.round(actual[field] * projection.scale))
    : undefined;
  const perIntervalShare = scale.perInterval
    ? 1 / scale.baselineIntervals
    : scale.averageLength / scale.baselineLength;
  const paceShare = getPaceShare(item.intervalData, scale);

  return {
    ...item,
    ...subtract(projected ?? actual, expected),
    intervalData,
    baseline: {
      expected,
      actual,
      projected,
      perInterval: fromTotals(field =>
        Math.round((baseline?.[field] ?? 0) * perIntervalShare),
      ),
      pacePerInterval: fromTotals(field =>
        Math.round(actual[field] * paceShare),
      ),
      budgeted: scale.budgeted,
    },
  };
}

/**
 * offsetItem for an offset baseline. Intervals whose window has no data
 * aren't compared, so they count towards the amount but not the change.
 */
function offsetItemByWindows<T extends OffsetItem>(
  item: T,
  intervalData: IntervalEntity[],
  baseline: OffsetItem | undefined,
  scale: BaselineScale,
  offset: NonNullable<BaselineScale['offset']>,
): T & { baseline: BaselineBreakdown } {
  const sum = (
    pick: (breakdown: BaselineBreakdown) => ReportValues | undefined,
  ) =>
    fromTotals(field =>
      intervalData.reduce((total, interval) => {
        const value = interval.baseline && pick(interval.baseline);
        return total + (value ? value[field] : 0);
      }, 0),
    );
  const isCompared = (breakdown: BaselineBreakdown) => !breakdown.noData;
  const actual = sum(breakdown => breakdown.actual);
  const comparedActual = sum(breakdown =>
    isCompared(breakdown) ? breakdown.actual : undefined,
  );
  const comparedCount = intervalData.filter(
    interval => interval.baseline && isCompared(interval.baseline),
  ).length;

  // The whole range's window, for projections and the Baseline column.
  // Days before the earliest transaction have nothing in them, so they add
  // nothing.
  const start = intervalData[0]?.intervalStartDate;
  const end = intervalData[intervalData.length - 1]?.intervalEndDate;
  const [windowStart, windowEnd] =
    start && end ? shiftRange(start, end, offset.days) : ['', ''];
  const fullWindow =
    start && end
      ? sumWindow(
          baseline?.intervalData ?? [],
          offset.bucketInterval,
          windowStart,
          windowEnd,
        )
      : mapValues(() => 0);

  const projection = getProjection(item.intervalData, scale);
  const expected = projection
    ? fullWindow
    : sum(breakdown =>
        isCompared(breakdown) ? breakdown.expected : undefined,
      );
  const projected = projection
    ? fromTotals(field => Math.round(actual[field] * projection.scale))
    : undefined;
  const paceShare = getPaceShare(item.intervalData, scale);

  return {
    ...item,
    ...subtract(projected ?? comparedActual, expected),
    intervalData,
    baseline: {
      expected,
      actual,
      projected,
      perInterval: fromTotals(field =>
        Math.round(fullWindow[field] / Math.max(comparedCount, 1)),
      ),
      pacePerInterval: fromTotals(field =>
        Math.round(actual[field] * paceShare),
      ),
      budgeted: scale.budgeted,
      ...(intervalData.length > 0 && comparedCount === 0 && { noData: true }),
    },
  };
}

function rowKey(row: GroupedEntity) {
  return `${row.id}|${row.uncategorizedId ?? ''}|${row.name}`;
}

function emptyRow(row: GroupedEntity, template: IntervalEntity[]) {
  const zero = mapValues(() => 0);
  return {
    ...row,
    ...zero,
    categories: undefined,
    intervalData: template.map(interval => ({
      date: interval.date,
      intervalStartDate: interval.intervalStartDate,
      intervalEndDate: interval.intervalEndDate,
      ...zero,
    })),
  };
}

function hasActivity(
  row: GroupedEntity | undefined,
  balanceTypeOp: balanceTypeOpType,
) {
  return (
    !!row && filterEmptyRows({ showEmpty: false, data: row, balanceTypeOp })
  );
}

/**
 * Pairs rows with their baseline and offsets each one. Rows only present in
 * the baseline are kept, since dropping to nothing is a change worth showing.
 * A row is only empty when neither range had any activity.
 */
export function offsetRows(
  actualRows: GroupedEntity[],
  baselineRows: GroupedEntity[],
  context: BaselineContext,
): GroupedEntity[] {
  const { scale, template, showEmpty, balanceTypeOp, sortByOp, sortAmount } =
    context;
  const baselineByKey = new Map(baselineRows.map(row => [rowKey(row), row]));
  const actualKeys = new Set(actualRows.map(rowKey));
  const pairs = [
    ...actualRows.map(row => ({
      actual: row,
      baseline: baselineByKey.get(rowKey(row)),
    })),
    ...baselineRows
      .filter(row => !actualKeys.has(rowKey(row)))
      .map(row => ({ actual: emptyRow(row, template), baseline: row })),
  ];

  return pairs
    .filter(
      ({ actual, baseline }) =>
        showEmpty ||
        hasActivity(actual, balanceTypeOp) ||
        hasActivity(baseline, balanceTypeOp),
    )
    .map(({ actual, baseline }) => {
      const hasCategories = !!(actual.categories || baseline?.categories);
      return {
        ...offsetItem(actual, baseline, scale),
        categories: hasCategories
          ? offsetRows(
              actual.categories ?? [],
              baseline?.categories ?? [],
              context,
            )
          : undefined,
      };
    })
    .sort(
      sortData(
        sortAmount === 'comparison'
          ? {
              balanceTypeOp,
              sortByOp,
              getValue: row => row.baseline?.expected[balanceTypeOp] ?? 0,
            }
          : sortAmount === 'current'
            ? {
                balanceTypeOp,
                sortByOp,
                getValue: row =>
                  row.baseline
                    ? (row.baseline.projected ?? row.baseline.actual)[
                        balanceTypeOp
                      ]
                    : 0,
              }
            : // A row's own amount is its change
              { balanceTypeOp, sortByOp, isSigned: true },
      ),
    );
}

function stackIntervals(
  intervals: IntervalEntity[],
  rows: GroupedEntity[],
  balanceTypeOp: balanceTypeOpType,
  showAmounts: boolean,
): IntervalEntity[] {
  const sign = getAmountSign(balanceTypeOp);
  // Intervals that haven't started have no amount, so lines stop at today.
  // Their baseline is drawn ahead only when it was kept for a projection.
  // Budgets are set ahead of time, so theirs are drawn as they are.
  const isUpcoming = (interval: IntervalEntity) =>
    balanceTypeOp !== 'totalBudgeted' &&
    !!interval.intervalStartDate &&
    isFuture(interval.intervalStartDate);
  const getAmount = (interval: IntervalEntity) => {
    const breakdown = interval.baseline;
    if (!breakdown || isUpcoming(interval)) {
      return null;
    }
    return sign * breakdown.actual[balanceTypeOp];
  };
  const getBaseline = (interval: IntervalEntity) => {
    const breakdown = interval.baseline;
    if (!breakdown || breakdown.noData) {
      return null;
    }
    if (isUpcoming(interval)) {
      return breakdown.upcoming
        ? sign * breakdown.upcoming[balanceTypeOp]
        : null;
    }
    return sign * breakdown.expected[balanceTypeOp];
  };

  return intervals.map((interval, index) => {
    const stacked: Record<string, number | null> = {};
    for (const row of rows) {
      const rowInterval = row.intervalData[index];
      if (!rowInterval) {
        continue;
      }

      // Tooltips list each series' amount and change whichever is drawn.
      // Changes are signed, unlike spending which the report spreadsheets
      // flip so it points up.
      const key = row.id || row.name;
      const amount = getAmount(rowInterval);
      const change =
        isUpcoming(rowInterval) || rowInterval.baseline?.noData
          ? null
          : rowInterval[balanceTypeOp];
      stacked[key] = showAmounts ? amount : change;
      stacked[getAmountKey(key)] = amount;
      stacked[getChangeKey(key)] = change;
      stacked[getBaselineKey(key)] = getBaseline(rowInterval);
    }

    return {
      date: interval.date,
      intervalStartDate: interval.intervalStartDate,
      intervalEndDate: interval.intervalEndDate,
      baselineStartDate: interval.baselineStartDate,
      baselineEndDate: interval.baselineEndDate,
      ...mapValues(field => interval[field]),
      baseline: interval.baseline,
      ...(showAmounts && {
        amount: getAmount(interval),
        baselineAmount: getBaseline(interval),
      }),
      ...stacked,
    };
  });
}

// The rows the report would show without a baseline, in its order, then the
// rows with only baseline activity, which it would hide as empty
function getAmountOrder(
  rows: GroupedEntity[],
  {
    showEmpty,
    balanceTypeOp,
    sortByOp,
  }: {
    showEmpty: boolean;
    balanceTypeOp: balanceTypeOpType;
    sortByOp: sortByOpType;
  },
) {
  const actualRows = rows.map(row =>
    row.baseline ? { ...row, ...row.baseline.actual } : row,
  );
  const isShown = (row: GroupedEntity) =>
    filterEmptyRows({ showEmpty, data: row, balanceTypeOp });

  return [
    ...actualRows.filter(isShown).sort(sortData({ balanceTypeOp, sortByOp })),
    ...actualRows.filter(row => !isShown(row)),
  ];
}

/**
 * Colours series as the report would without a baseline, where they're
 * ordered by amount, so turning the baseline on or off or sorting by change
 * doesn't reshuffle the colours.
 */
function keepAmountColors(
  legend: LegendEntity[],
  amountOrderLegend: LegendEntity[],
): LegendEntity[] {
  const colors = new Map(
    amountOrderLegend.map(entry => [entry.dataKey, entry.color]),
  );
  return legend.map(entry => ({
    ...entry,
    color: colors.get(entry.dataKey) ?? entry.color,
  }));
}

function colorBySign(
  legend: LegendEntity[],
  values: ReportValues[],
  balanceTypeOp: balanceTypeOpType,
): LegendEntity[] {
  return legend.map((entry, index) => ({
    ...entry,
    color:
      (values[index]?.[balanceTypeOp] ?? 0) < 0
        ? theme.reportsNumberNegative
        : theme.reportsNumberPositive,
  }));
}

// A single series is coloured by the sign of what it draws: its change, or
// its amount like it would be without a baseline. Everything else keeps its
// category colours.
function colorLegend(
  legend: LegendEntity[],
  {
    groupBy,
    intervalData,
    balanceTypeOp,
    showAmounts,
  }: {
    groupBy: string;
    intervalData: IntervalEntity[];
    balanceTypeOp: balanceTypeOpType;
    showAmounts: boolean;
  },
): LegendEntity[] {
  if (groupBy !== 'Interval') {
    return legend;
  }
  return colorBySign(
    legend,
    showAmounts
      ? intervalData.map(interval => interval.baseline?.actual ?? interval)
      : intervalData,
    balanceTypeOp,
  );
}

// Trimming looks at what actually happened, so an interval doesn't count as
// active just because it differs from the baseline. Intervals that haven't
// started are empty, so trailing ones are trimmed too.
function toActual(intervals: IntervalEntity[]): IntervalEntity[] {
  return intervals.map(interval =>
    interval.baseline ? { ...interval, ...interval.baseline.actual } : interval,
  );
}

export function getTrimRange(
  rows: GroupedEntity[],
  intervals: IntervalEntity[],
  balanceTypeOp: balanceTypeOpType,
) {
  const actualRows = rows.flatMap(row => [row, ...(row.categories ?? [])]);
  return determineIntervalRange(
    actualRows.map(row => ({
      ...row,
      intervalData: toActual(row.intervalData),
    })),
    toActual(intervals),
    true,
    balanceTypeOp,
  );
}

// Totals keep covering the whole range; only the drawn intervals are trimmed
function trimRows(
  rows: GroupedEntity[],
  { startIndex, endIndex }: { startIndex: number; endIndex: number },
): GroupedEntity[] {
  return rows.map(row => ({
    ...row,
    intervalData: trimIntervalDataToRange(
      row.intervalData,
      startIndex,
      endIndex,
    ),
    categories:
      row.categories &&
      trimRows(row.categories, {
        startIndex,
        endIndex,
      }),
  }));
}

async function collect<T>(
  getData: SpreadsheetFn<T>,
  spreadsheet: Spreadsheet,
): Promise<T | undefined> {
  const holder: { data?: T } = {};
  await getData(spreadsheet, data => {
    holder.data = data;
  });
  return holder.data;
}

function countIntervals(
  startDate: string,
  endDate: string,
  interval: string,
  firstDayOfWeekIdx: createCustomSpreadsheetProps['firstDayOfWeekIdx'],
) {
  const intervals =
    interval === 'Weekly'
      ? monthUtils.weekRangeInclusive(startDate, endDate, firstDayOfWeekIdx)
      : monthUtils[
          ReportOptions.intervalRange.get(interval) || 'rangeInclusive'
        ](startDate, endDate);
  return Math.max(intervals.length, 1);
}

/**
 * The average full length of the given intervals, for the Baseline column.
 * Using full lengths keeps the column equal to what every whole interval is
 * compared against, so only intervals the range cuts short differ from it.
 */
export function getAverageDays(intervals: IntervalEntity[], interval: string) {
  return getAverageLength(intervals, interval, getFullIntervalDays);
}

/**
 * The same as getAverageDays, in months, for budgeted baselines.
 */
export function getAverageMonths(
  intervals: IntervalEntity[],
  interval: string,
) {
  return getAverageLength(intervals, interval, getFullIntervalMonths);
}

function getAverageLength(
  intervals: IntervalEntity[],
  interval: string,
  getFullLength: (intervalStartDate: string, interval: string) => number,
) {
  const lengths = intervals.flatMap(({ intervalStartDate }) =>
    intervalStartDate ? [getFullLength(intervalStartDate, interval)] : [],
  );
  if (lengths.length === 0) {
    return 1;
  }
  return lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
}

function getAverageInUnit(
  intervals: IntervalEntity[],
  interval: string,
  budgeted: boolean,
) {
  return budgeted
    ? getAverageMonths(intervals, interval)
    : getAverageDays(intervals, interval);
}

function getScale(
  props: createCustomSpreadsheetProps,
  baselineOptions: BaselineOptions,
  template: IntervalEntity[],
): BaselineScale {
  const budgeted = !!baselineOptions.budgeted;
  return {
    // Budgets are set ahead for whole months, so a budgeted baseline counts
    // all of its months, even ones that haven't finished
    baselineLength: budgeted
      ? countBudgetMonths(baselineOptions.startDate, baselineOptions.endDate)
      : countElapsedDays(baselineOptions.startDate, baselineOptions.endDate),
    budgeted,
    baselineIntervals: countIntervals(
      baselineOptions.startDate,
      baselineOptions.endDate,
      props.interval,
      props.firstDayOfWeekIdx,
    ),
    perInterval: props.balanceTypeOp === 'totalBudgeted',
    projectToFullPeriod: baselineOptions.projectToFullPeriod,
    averageDays: getAverageDays(template, props.interval),
    averageLength: getAverageInUnit(template, props.interval, budgeted),
    offset: baselineOptions.offset && {
      ...baselineOptions.offset,
      bucketInterval: getOffsetBucketInterval(props),
    },
  };
}

// Offset windows don't line up with the report's intervals, so the baseline
// is fetched by day and summed per window. Budgets are dated by month, so
// they're fetched by month and spread over the days of each window.
function getOffsetBucketInterval(props: createCustomSpreadsheetProps) {
  return props.balanceTypeOp === 'totalBudgeted' ? 'Monthly' : 'Daily';
}

// Budgets are fetched for every month a range touches
function countBudgetMonths(startDate: string, endDate: string) {
  return monthUtils.rangeInclusive(
    monthUtils.getMonth(startDate),
    monthUtils.getMonth(endDate),
  ).length;
}

function getVisibleScale(
  scale: BaselineScale,
  template: IntervalEntity[],
  { startIndex, endIndex }: { startIndex: number; endIndex: number },
  interval: string,
): BaselineScale {
  const visible = trimIntervalDataToRange(template, startIndex, endIndex);
  return {
    ...scale,
    averageDays: getAverageDays(visible, interval),
    averageLength: getAverageInUnit(visible, interval, scale.budgeted),
  };
}

// Empty rows are filtered and intervals trimmed after offsetting, since
// projecting and comparing a range needs all of its intervals, including ones
// that haven't started yet
function getSpreadsheetProps(
  props: createCustomSpreadsheetProps,
  baselineOptions: BaselineOptions,
) {
  const actual = { ...props, showEmpty: true, trimIntervals: false };
  return {
    actual,
    baseline: {
      ...actual,
      startDate: baselineOptions.startDate,
      endDate: baselineOptions.endDate,
      // A range baseline only compares its totals. Budgets are dated by
      // month, so they're fetched by month whatever the report's interval is.
      ...(baselineOptions.budgeted && {
        balanceTypeOp: 'totalBudgeted' as const,
        interval: 'Monthly',
      }),
      ...(baselineOptions.offset && {
        interval: getOffsetBucketInterval(props),
      }),
    },
  };
}

/**
 * Budgets as the amounts they plan for, so they compare against what was
 * spent. Budgets are positive for spending, which reports count as negative.
 * Income isn't budgeted, so it's compared against nothing.
 */
export function fromBudget<T extends ReportValues>(item: T): T {
  const budgeted = item.totalBudgeted;
  return {
    ...item,
    ...fromTotals(field => {
      switch (field) {
        case 'totalAssets':
          return 0;
        case 'totalBudgeted':
          return budgeted;
        default:
          return -budgeted;
      }
    }),
  };
}

export function rowsFromBudget(rows: GroupedEntity[]): GroupedEntity[] {
  return rows.map(row => ({
    ...fromBudget(row),
    categories: row.categories && rowsFromBudget(row.categories),
  }));
}

export function createBaselineSpreadsheet(
  props: createCustomSpreadsheetProps,
  baselineOptions: BaselineOptions,
) {
  const {
    showEmpty,
    trimIntervals,
    balanceTypeOp = 'totalDebts',
    sortByOp = 'desc',
    groupBy = '',
    graphType,
  } = props;
  const spreadsheetProps = getSpreadsheetProps(props, baselineOptions);
  const getActual = createCustomSpreadsheet(spreadsheetProps.actual);
  const getBaseline = createCustomSpreadsheet(spreadsheetProps.baseline);

  return async (
    spreadsheet: Spreadsheet,
    setData: (data: DataEntity) => void,
  ) => {
    const [actual, fetchedBaseline] = await Promise.all([
      collect(getActual, spreadsheet),
      collect(getBaseline, spreadsheet),
    ]);
    if (!actual) {
      return;
    }
    const baseline =
      fetchedBaseline && baselineOptions.budgeted
        ? {
            ...fromBudget(fetchedBaseline),
            data: rowsFromBudget(fetchedBaseline.data ?? []),
          }
        : fetchedBaseline;

    const offset = (scale: BaselineScale) => ({
      rows: offsetRows(actual.data ?? [], baseline?.data ?? [], {
        scale,
        template: actual.intervalData,
        showEmpty,
        balanceTypeOp,
        sortByOp,
        sortAmount: baselineOptions.sortAmount ?? 'current',
      }),
      totals: offsetItem(actual, baseline, scale),
    });

    const scale = getScale(props, baselineOptions, actual.intervalData);
    const untrimmed = offset(scale);
    const trimRange = trimIntervals
      ? getTrimRange(
          untrimmed.rows,
          untrimmed.totals.intervalData,
          balanceTypeOp,
        )
      : null;
    // The Baseline column follows the intervals left after trimming
    const { rows: untrimmedRows, totals } = trimRange
      ? offset(
          getVisibleScale(
            scale,
            actual.intervalData,
            trimRange,
            props.interval,
          ),
        )
      : untrimmed;
    const rows = trimRange ? trimRows(untrimmedRows, trimRange) : untrimmedRows;
    const intervalData = stackIntervals(
      trimRange
        ? trimIntervalDataToRange(
            totals.intervalData,
            trimRange.startIndex,
            trimRange.endIndex,
          )
        : totals.intervalData,
      rows,
      balanceTypeOp,
      !!baselineOptions.showAmounts,
    );

    const legend = keepAmountColors(
      calculateLegend(intervalData, rows, groupBy, graphType, balanceTypeOp),
      calculateLegend(
        intervalData,
        getAmountOrder(rows, { showEmpty, balanceTypeOp, sortByOp }),
        groupBy,
        graphType,
        balanceTypeOp,
      ),
    );

    setData({
      ...totals,
      data: rows,
      intervalData,
      legend: colorLegend(legend, {
        groupBy,
        intervalData,
        balanceTypeOp,
        showAmounts: !!baselineOptions.showAmounts,
      }),
      baselineStartDate: baselineOptions.startDate,
      baselineEndDate: baselineOptions.endDate,
    });
  };
}

export function createBaselineGroupedSpreadsheet(
  props: createCustomSpreadsheetProps,
  baselineOptions: BaselineOptions,
) {
  const {
    showEmpty,
    trimIntervals,
    balanceTypeOp = 'totalDebts',
    sortByOp = 'desc',
  } = props;
  const spreadsheetProps = getSpreadsheetProps(props, baselineOptions);
  const getActual = createGroupedSpreadsheet(spreadsheetProps.actual);
  const getBaseline = createGroupedSpreadsheet(spreadsheetProps.baseline);

  return async (
    spreadsheet: Spreadsheet,
    setData: (data: GroupedEntity[]) => void,
  ) => {
    const [actual = [], fetchedBaseline = []] = await Promise.all([
      collect(getActual, spreadsheet),
      collect(getBaseline, spreadsheet),
    ]);
    const baseline = baselineOptions.budgeted
      ? rowsFromBudget(fetchedBaseline)
      : fetchedBaseline;

    const template = actual[0]?.intervalData ?? [];
    const offset = (scale: BaselineScale) =>
      offsetRows(actual, baseline, {
        scale,
        template,
        showEmpty,
        balanceTypeOp,
        sortByOp,
        sortAmount: baselineOptions.sortAmount ?? 'current',
      });

    const scale = getScale(props, baselineOptions, template);
    const rows = offset(scale);
    if (!trimIntervals) {
      setData(rows);
      return;
    }

    // The Baseline column follows the intervals left after trimming
    const trimRange = getTrimRange(
      rows,
      rows[0]?.intervalData ?? [],
      balanceTypeOp,
    );
    setData(
      trimRows(
        offset(getVisibleScale(scale, template, trimRange, props.interval)),
        trimRange,
      ),
    );
  };
}
