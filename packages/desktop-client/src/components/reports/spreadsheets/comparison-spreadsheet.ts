import { theme } from '@actual-app/components/theme';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  balanceTypeOpType,
  ComparisonBreakdown,
  CustomReportComparisonSortAmount,
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
  getChangeKey,
  getComparisonKey,
  getFullIntervalDays,
  getFullIntervalMonths,
  getFullIntervalRange,
  shiftRange,
} from '#components/reports/comparisonRange';
import type { ComparisonShift } from '#components/reports/comparisonRange';
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

export type ComparisonOptions = {
  startDate: string;
  endDate: string;
  projectToFullPeriod: boolean;
  // Graphs draw amounts against the comparison rather than changes, so rows
  // sort by amount and intervals carry each series' amount and comparison
  showAmounts?: boolean;
  // The amount rows sort by. Without it, rows sort by the current amount.
  sortAmount?: CustomReportComparisonSortAmount;
  // Compare against the average of what was budgeted over the range, rather
  // than what was spent
  budgeted?: boolean;
  // Compare each interval with its own window this far back, rather than
  // with the range's average. The range is then the report's range moved
  // back by the offset.
  offset?: ComparisonOffset;
};

export type ComparisonOffset = {
  shift: ComparisonShift;
  // Windows that end before this have nothing to compare against
  earliestTransaction: string;
  // Scale each window to its interval's days, since calendar months differ
  // in length. Budgets are set per month, so they're never scaled.
  compareDailyAverage?: boolean;
};

// How comparison totals map onto the report's intervals
export type ComparisonScale = {
  // The comparison's length in its unit. Spending accrues per day, and budgets
  // are set per month, so a budgeted comparison is spread by months.
  comparisonLength: number;
  budgeted: boolean;
  comparisonIntervals: number;
  // Budgets are set per interval rather than accrued per day
  perInterval: boolean;
  projectToFullPeriod: boolean;
  // Average full length of the displayed intervals in days, for the pace of
  // actual amounts
  averageDays: number;
  // The same in the comparison's unit, for the Comparison column
  averageLength: number;
  // With an offset comparison: the offset, and the interval the comparison was
  // fetched by, which windows are summed from
  offset?: ComparisonOffset & { bucketInterval: string };
};

// How much of the comparison a range gets, in the comparison's unit
function measure(scale: ComparisonScale, start: string, end: string) {
  return scale.budgeted ? countMonths(start, end) : countDays(start, end);
}

function measureElapsed(scale: ComparisonScale, start: string, end: string) {
  return scale.budgeted
    ? countElapsedMonths(start, end)
    : countElapsedDays(start, end);
}

type ComparisonContext = {
  scale: ComparisonScale;
  template: IntervalEntity[];
  showEmpty: boolean;
  balanceTypeOp: balanceTypeOpType;
  sortByOp: sortByOpType;
  sortAmount: CustomReportComparisonSortAmount;
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

// Scales every field, so nets summed from intervals keep their own scale
function scaleValues(values: ReportValues, factor: number): ReportValues {
  return mapValues(field => Math.round(values[field] * factor));
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

const BREAKDOWN_VALUES = [
  'expected',
  'actual',
  'projected',
  'perInterval',
  'upcoming',
  'pacePerInterval',
] as const;

// Net fields only keep one sign, so a total's net is the sum of what it's made
// of rather than its own total's net
function sumNets<T extends ReportValues>(
  target: T,
  sources: (ReportValues | undefined)[],
): T {
  const sum = (field: 'netAssets' | 'netDebts') =>
    sources.reduce((total, source) => total + (source?.[field] ?? 0), 0);
  return { ...target, netAssets: sum('netAssets'), netDebts: sum('netDebts') };
}

function sumBreakdownNets(
  target: ComparisonBreakdown,
  sources: (ComparisonBreakdown | undefined)[],
): ComparisonBreakdown {
  const result = { ...target };
  for (const key of BREAKDOWN_VALUES) {
    const values = target[key];
    const parts = sources.map(source => source?.[key]);
    // Intervals have no averages of their own, so those are kept
    if (values && parts.some(Boolean)) {
      result[key] = sumNets(values, parts);
    }
  }
  return result;
}

/**
 * Sums a total's net fields from the rows that are shown, so they match the
 * bars stacked from them and the rows in the table. Split by interval, each
 * interval is a row of its own, and offsetItem sums their nets instead.
 */
export function sumNetsFromRows<
  T extends OffsetItem & { comparison: ComparisonBreakdown },
>(totals: T, rows: GroupedEntity[], groupBy: string): T {
  if (groupBy === 'Interval') {
    return totals;
  }
  const intervalData = totals.intervalData.map((interval, index) => {
    const parts = rows.map(row => row.intervalData[index]);
    return {
      ...sumNets(interval, parts),
      comparison:
        interval.comparison &&
        sumBreakdownNets(
          interval.comparison,
          parts.map(part => part?.comparison),
        ),
    };
  });
  return {
    ...sumNets(totals, rows),
    intervalData,
    comparison: sumBreakdownNets(
      totals.comparison,
      rows.map(row => row.comparison),
    ),
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
 * The comparison's total over a window, from the intervals it was fetched by.
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
  comparison: OffsetItem | undefined,
  scale: ComparisonScale,
  offset: NonNullable<ComparisonScale['offset']>,
): IntervalEntity {
  const [windowStart, windowEnd] = shiftRange(start, end, offset.shift);
  const window = {
    comparisonStartDate: windowStart,
    comparisonEndDate: windowEnd,
  };
  // By daily average, a window counts as if it were as long as its interval
  const sum = (from: string, to: string, days: number) => {
    const total = sumWindow(
      comparison?.intervalData ?? [],
      offset.bucketInterval,
      from,
      to,
    );
    return offset.compareDailyAverage
      ? scaleValues(total, days / countDays(from, to))
      : total;
  };
  const zero = mapValues(() => 0);
  const actual = fromTotals(field => interval[field]);

  if (windowEnd < offset.earliestTransaction) {
    return {
      ...interval,
      ...window,
      ...zero,
      comparison: {
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
      comparison: {
        expected: zero,
        actual: zero,
        upcoming: sum(windowStart, windowEnd, countDays(start, end)),
        budgeted: scale.budgeted,
      },
    };
  }

  const elapsedEnd = scale.perInterval
    ? end
    : earlierOf(end, monthUtils.currentDay());
  const expected = sum(
    windowStart,
    shiftRange(start, elapsedEnd, offset.shift)[1],
    countDays(start, elapsedEnd),
  );
  return {
    ...interval,
    ...window,
    ...subtract(actual, expected),
    comparison: { expected, actual, budgeted: scale.budgeted },
  };
}

/**
 * Offsets one interval by the comparison's average over the same length, or
 * by its own window with an offset comparison.
 */
export function offsetInterval(
  interval: IntervalEntity,
  comparison: OffsetItem | undefined,
  scale: ComparisonScale,
): IntervalEntity {
  const start = interval.intervalStartDate;
  const end = interval.intervalEndDate ?? start;
  // Report spreadsheets always date their intervals; without dates there's
  // no length to scale the comparison by
  if (!start || !end) {
    return interval;
  }

  if (scale.offset) {
    return offsetIntervalByWindow(
      interval,
      monthUtils.dayFromDate(start),
      monthUtils.dayFromDate(end),
      comparison,
      scale,
      scale.offset,
    );
  }

  // Intervals that haven't started have nothing to compare yet, so they stay
  // empty rather than showing the whole comparison as a change. Budgets are set
  // ahead of time, so theirs are still compared.
  if (!scale.perInterval && isFuture(start)) {
    const zero = mapValues(() => 0);
    // Charts only draw the comparison ahead when the amount is projected there
    const length = measure(scale, start, end);
    const upcoming = scale.projectToFullPeriod
      ? fromTotals(field =>
          Math.round(
            ((comparison?.[field] ?? 0) * length) / scale.comparisonLength,
          ),
        )
      : undefined;
    return {
      ...interval,
      ...zero,
      comparison: {
        expected: zero,
        actual: zero,
        upcoming,
        budgeted: scale.budgeted,
      },
    };
  }

  // An interval in progress is compared with the comparison over the days
  // that have passed. Projecting from its first few days is too unreliable,
  // so projections only cover the whole range.
  const share = scale.perInterval
    ? 1 / scale.comparisonIntervals
    : measureElapsed(scale, start, end) / scale.comparisonLength;

  const expected = fromTotals(field =>
    Math.round((comparison?.[field] ?? 0) * share),
  );
  const actual = fromTotals(field => interval[field]);

  return {
    ...interval,
    ...subtract(actual, expected),
    comparison: { expected, actual, budgeted: scale.budgeted },
  };
}

function isFuture(date: string) {
  return monthUtils.dayFromDate(date) > monthUtils.currentDay();
}

// The whole range a row's intervals cover, for projecting its total
function getProjection(intervals: IntervalEntity[], scale: ComparisonScale) {
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
function getPaceShare(intervals: IntervalEntity[], scale: ComparisonScale) {
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
 * comparison over the whole range, which includes intervals that haven't
 * started. When the intervals are the report's rows, sumIntervalNets sums
 * net fields from them, like totals summed from rows.
 */
export function offsetItem<T extends OffsetItem>(
  item: T,
  comparison: OffsetItem | undefined,
  scale: ComparisonScale,
  sumIntervalNets = false,
): T & { comparison: ComparisonBreakdown } {
  const intervalData = item.intervalData.map(interval =>
    offsetInterval(interval, comparison, scale),
  );
  if (scale.offset) {
    return offsetItemByWindows(
      item,
      intervalData,
      comparison,
      scale,
      scale.offset,
      sumIntervalNets,
    );
  }
  const sum = (
    pick: (breakdown: ComparisonBreakdown) => ReportValues | undefined,
  ) => {
    const parts = intervalData.map(
      interval =>
        interval.comparison &&
        (pick(interval.comparison) ?? interval.comparison.actual),
    );
    const total = fromTotals(field =>
      parts.reduce((sum, part) => sum + (part ? part[field] : 0), 0),
    );
    return sumIntervalNets ? sumNets(total, parts) : total;
  };

  const actual = sum(breakdown => breakdown.actual);
  const projection = getProjection(item.intervalData, scale);
  const expected = projection
    ? fromTotals(field =>
        Math.round(
          ((comparison?.[field] ?? 0) * projection.length) /
            scale.comparisonLength,
        ),
      )
    : sum(breakdown => breakdown.expected);
  const projected = projection
    ? scaleValues(actual, projection.scale)
    : undefined;
  const perIntervalShare = scale.perInterval
    ? 1 / scale.comparisonIntervals
    : scale.averageLength / scale.comparisonLength;
  const paceShare = getPaceShare(item.intervalData, scale);

  return {
    ...item,
    ...subtract(projected ?? actual, expected),
    intervalData,
    comparison: {
      expected,
      actual,
      projected,
      perInterval: fromTotals(field =>
        Math.round((comparison?.[field] ?? 0) * perIntervalShare),
      ),
      pacePerInterval: scaleValues(actual, paceShare),
      budgeted: scale.budgeted,
    },
  };
}

/**
 * offsetItem for an offset comparison. Intervals whose window has no data
 * aren't compared, so they count towards the amount but not the change.
 */
function offsetItemByWindows<T extends OffsetItem>(
  item: T,
  intervalData: IntervalEntity[],
  comparison: OffsetItem | undefined,
  scale: ComparisonScale,
  offset: NonNullable<ComparisonScale['offset']>,
  sumIntervalNets: boolean,
): T & { comparison: ComparisonBreakdown } {
  const sum = (
    pick: (breakdown: ComparisonBreakdown) => ReportValues | undefined,
  ) => {
    const parts = intervalData.map(
      interval => interval.comparison && pick(interval.comparison),
    );
    const total = fromTotals(field =>
      parts.reduce((sum, part) => sum + (part ? part[field] : 0), 0),
    );
    return sumIntervalNets ? sumNets(total, parts) : total;
  };
  const sumComparisonWindow = (from: string, to: string) =>
    sumWindow(comparison?.intervalData ?? [], offset.bucketInterval, from, to);
  const isCompared = (breakdown: ComparisonBreakdown) => !breakdown.noData;
  const actual = sum(breakdown => breakdown.actual);
  const comparedActual = sum(breakdown =>
    isCompared(breakdown) ? breakdown.actual : undefined,
  );
  const comparedCount = intervalData.filter(
    interval => interval.comparison && isCompared(interval.comparison),
  ).length;

  // The whole range's window, for projections and the Comparison column.
  // Days before the earliest transaction have nothing in them, so they add
  // nothing.
  const start = intervalData[0]?.intervalStartDate;
  const end = intervalData[intervalData.length - 1]?.intervalEndDate;
  // Each interval's own window, including the days that haven't passed yet
  const intervalWindows = intervalData.map(interval => {
    const from = interval.comparisonStartDate;
    const to = interval.comparisonEndDate;
    if (!from || !to) {
      return undefined;
    }
    const total = sumComparisonWindow(from, to);
    return offset.compareDailyAverage &&
      interval.intervalStartDate &&
      interval.intervalEndDate
      ? scaleValues(
          total,
          countDays(interval.intervalStartDate, interval.intervalEndDate) /
            countDays(from, to),
        )
      : total;
  });
  const [windowStart, windowEnd] =
    start && end ? shiftRange(start, end, offset.shift) : ['', ''];
  // By daily average, the range is the sum of its scaled windows
  const wholeWindow = offset.compareDailyAverage
    ? fromTotals(field =>
        intervalWindows.reduce(
          (total, window) => total + (window ? window[field] : 0),
          0,
        ),
      )
    : start && end
      ? sumComparisonWindow(windowStart, windowEnd)
      : mapValues(() => 0);
  const fullWindow = sumIntervalNets
    ? sumNets(wholeWindow, intervalWindows)
    : wholeWindow;

  const projection = getProjection(item.intervalData, scale);
  const expected = projection
    ? fullWindow
    : sum(breakdown =>
        isCompared(breakdown) ? breakdown.expected : undefined,
      );
  const projected = projection
    ? scaleValues(actual, projection.scale)
    : undefined;
  const paceShare = getPaceShare(item.intervalData, scale);

  return {
    ...item,
    ...subtract(projected ?? comparedActual, expected),
    intervalData,
    comparison: {
      expected,
      actual,
      projected,
      perInterval: mapValues(field =>
        Math.round(fullWindow[field] / Math.max(comparedCount, 1)),
      ),
      pacePerInterval: scaleValues(actual, paceShare),
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
 * Pairs rows with their comparison and offsets each one. Rows only present in
 * the comparison are kept, since dropping to nothing is a change worth showing.
 * A row is only empty when neither range had any activity.
 */
export function offsetRows(
  actualRows: GroupedEntity[],
  comparisonRows: GroupedEntity[],
  context: ComparisonContext,
): GroupedEntity[] {
  const { scale, template, showEmpty, balanceTypeOp, sortByOp, sortAmount } =
    context;
  const comparisonByKey = new Map(
    comparisonRows.map(row => [rowKey(row), row]),
  );
  const actualKeys = new Set(actualRows.map(rowKey));
  const pairs = [
    ...actualRows.map(row => ({
      actual: row,
      comparison: comparisonByKey.get(rowKey(row)),
    })),
    ...comparisonRows
      .filter(row => !actualKeys.has(rowKey(row)))
      .map(row => ({ actual: emptyRow(row, template), comparison: row })),
  ];

  return pairs
    .filter(
      ({ actual, comparison }) =>
        showEmpty ||
        hasActivity(actual, balanceTypeOp) ||
        hasActivity(comparison, balanceTypeOp),
    )
    .map(({ actual, comparison }) => {
      const hasCategories = !!(actual.categories || comparison?.categories);
      return {
        ...offsetItem(actual, comparison, scale),
        categories: hasCategories
          ? offsetRows(
              actual.categories ?? [],
              comparison?.categories ?? [],
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
              getValue: row => row.comparison?.expected[balanceTypeOp] ?? 0,
            }
          : sortAmount === 'current'
            ? // Projections scale every row by the same factor, so sorting
              // by them would give the same order
              {
                balanceTypeOp,
                sortByOp,
                getValue: row => row.comparison?.actual[balanceTypeOp] ?? 0,
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
  // Their comparison is drawn ahead only when it was kept for a projection.
  // Budgets are set ahead of time, so theirs are drawn as they are.
  const isUpcoming = (interval: IntervalEntity) =>
    balanceTypeOp !== 'totalBudgeted' &&
    !!interval.intervalStartDate &&
    isFuture(interval.intervalStartDate);
  const getAmount = (interval: IntervalEntity) => {
    const breakdown = interval.comparison;
    if (!breakdown || isUpcoming(interval)) {
      return null;
    }
    return sign * breakdown.actual[balanceTypeOp];
  };
  const getComparison = (interval: IntervalEntity) => {
    const breakdown = interval.comparison;
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
        isUpcoming(rowInterval) || rowInterval.comparison?.noData
          ? null
          : rowInterval[balanceTypeOp];
      stacked[key] = showAmounts ? amount : change;
      stacked[getAmountKey(key)] = amount;
      stacked[getChangeKey(key)] = change;
      stacked[getComparisonKey(key)] = getComparison(rowInterval);
    }

    return {
      date: interval.date,
      intervalStartDate: interval.intervalStartDate,
      intervalEndDate: interval.intervalEndDate,
      comparisonStartDate: interval.comparisonStartDate,
      comparisonEndDate: interval.comparisonEndDate,
      ...mapValues(field => interval[field]),
      comparison: interval.comparison,
      ...(showAmounts && {
        amount: getAmount(interval),
        comparisonAmount: getComparison(interval),
      }),
      ...stacked,
    };
  });
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
// its amount like it would be without a comparison. Everything else keeps its
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
      ? intervalData.map(interval => interval.comparison?.actual ?? interval)
      : intervalData,
    balanceTypeOp,
  );
}

// Trimming looks at what actually happened, so an interval doesn't count as
// active just because it differs from the comparison. Intervals that haven't
// started are empty, so trailing ones are trimmed too.
function toActual(intervals: IntervalEntity[]): IntervalEntity[] {
  return intervals.map(interval =>
    interval.comparison
      ? { ...interval, ...interval.comparison.actual }
      : interval,
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
 * The average full length of the given intervals, for the Comparison column.
 * Using full lengths keeps the column equal to what every whole interval is
 * compared against, so only intervals the range cuts short differ from it.
 */
export function getAverageDays(intervals: IntervalEntity[], interval: string) {
  return getAverageLength(intervals, interval, getFullIntervalDays);
}

/**
 * The same as getAverageDays, in months, for budgeted comparisons.
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
  comparisonOptions: ComparisonOptions,
  template: IntervalEntity[],
): ComparisonScale {
  const budgeted = !!comparisonOptions.budgeted;
  return {
    // Budgets are set ahead for whole months, so a budgeted comparison counts
    // all of its months, even ones that haven't finished
    comparisonLength: budgeted
      ? countBudgetMonths(
          comparisonOptions.startDate,
          comparisonOptions.endDate,
        )
      : countElapsedDays(
          comparisonOptions.startDate,
          comparisonOptions.endDate,
        ),
    budgeted,
    comparisonIntervals: countIntervals(
      comparisonOptions.startDate,
      comparisonOptions.endDate,
      props.interval,
      props.firstDayOfWeekIdx,
    ),
    perInterval: props.balanceTypeOp === 'totalBudgeted',
    projectToFullPeriod: comparisonOptions.projectToFullPeriod,
    averageDays: getAverageDays(template, props.interval),
    averageLength: getAverageInUnit(template, props.interval, budgeted),
    offset: comparisonOptions.offset && {
      ...comparisonOptions.offset,
      compareDailyAverage:
        !budgeted && !!comparisonOptions.offset.compareDailyAverage,
      bucketInterval: getOffsetBucketInterval(props, budgeted),
    },
  };
}

// Offset windows don't line up with the report's intervals, so the comparison
// is fetched by day and summed per window. Budgets are dated by month, so
// they're fetched by month and spread over the days of each window.
function getOffsetBucketInterval(
  props: createCustomSpreadsheetProps,
  budgeted: boolean,
) {
  return budgeted || props.balanceTypeOp === 'totalBudgeted'
    ? 'Monthly'
    : 'Daily';
}

// Budgets are fetched for every month a range touches
function countBudgetMonths(startDate: string, endDate: string) {
  return monthUtils.rangeInclusive(
    monthUtils.getMonth(startDate),
    monthUtils.getMonth(endDate),
  ).length;
}

function getVisibleScale(
  scale: ComparisonScale,
  template: IntervalEntity[],
  { startIndex, endIndex }: { startIndex: number; endIndex: number },
  interval: string,
): ComparisonScale {
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
/**
 * The coarsest interval whose buckets start and end with a range. Queries
 * round a range out to whole buckets, except Weekly, which is queried by day.
 */
export function getRangeBucketInterval(startDate: string, endDate: string) {
  if (
    startDate !== monthUtils.firstDayOfMonth(startDate) ||
    endDate !== monthUtils.lastDayOfMonth(endDate)
  ) {
    return 'Weekly';
  }
  return startDate.slice(5, 7) === '01' && endDate.slice(5, 7) === '12'
    ? 'Yearly'
    : 'Monthly';
}

function getSpreadsheetProps(
  props: createCustomSpreadsheetProps,
  comparisonOptions: ComparisonOptions,
) {
  const actual = { ...props, showEmpty: true, trimIntervals: false };
  return {
    actual,
    comparison: {
      ...actual,
      startDate: comparisonOptions.startDate,
      endDate: comparisonOptions.endDate,
      // A range comparison only compares its totals, so it's fetched in
      // the fewest buckets that keep its dates. Budgets are dated by month,
      // so they're fetched by month whatever the report's interval is.
      interval: getRangeBucketInterval(
        comparisonOptions.startDate,
        comparisonOptions.endDate,
      ),
      ...(comparisonOptions.budgeted && {
        balanceTypeOp: 'totalBudgeted' as const,
        interval: 'Monthly',
      }),
      ...(comparisonOptions.offset && {
        interval: getOffsetBucketInterval(props, !!comparisonOptions.budgeted),
      }),
    },
  };
}

/**
 * Budgets as the amounts they plan for, so they compare against what was
 * spent. Budgets are positive for spending, which reports count as negative.
 * Income isn't budgeted, so it's compared against nothing.
 */
export function fromBudget<
  T extends ReportValues & { intervalData?: IntervalEntity[] },
>(item: T): T {
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
    // Offset windows are summed from the intervals, so they're converted too
    ...(item.intervalData && {
      intervalData: item.intervalData.map(interval => fromBudget(interval)),
    }),
  };
}

export function rowsFromBudget(rows: GroupedEntity[]): GroupedEntity[] {
  return rows.map(row => ({
    ...fromBudget(row),
    categories: row.categories && rowsFromBudget(row.categories),
  }));
}

export function createComparisonSpreadsheet(
  props: createCustomSpreadsheetProps,
  comparisonOptions: ComparisonOptions,
) {
  const {
    showEmpty,
    trimIntervals,
    balanceTypeOp = 'totalDebts',
    sortByOp = 'desc',
    groupBy = '',
    graphType,
  } = props;
  const spreadsheetProps = getSpreadsheetProps(props, comparisonOptions);
  const getActual = createCustomSpreadsheet(spreadsheetProps.actual);
  const getComparison = createCustomSpreadsheet(spreadsheetProps.comparison);

  return async (
    spreadsheet: Spreadsheet,
    setData: (data: DataEntity) => void,
  ) => {
    const [actual, fetchedComparison] = await Promise.all([
      collect(getActual, spreadsheet),
      collect(getComparison, spreadsheet),
    ]);
    if (!actual) {
      return;
    }
    const comparison =
      fetchedComparison && comparisonOptions.budgeted
        ? {
            ...fromBudget(fetchedComparison),
            data: rowsFromBudget(fetchedComparison.data ?? []),
          }
        : fetchedComparison;

    const offset = (scale: ComparisonScale) => ({
      rows: offsetRows(actual.data ?? [], comparison?.data ?? [], {
        scale,
        template: actual.intervalData,
        showEmpty,
        balanceTypeOp,
        sortByOp,
        sortAmount: comparisonOptions.sortAmount ?? 'current',
      }),
      totals: offsetItem(actual, comparison, scale, groupBy === 'Interval'),
    });

    const scale = getScale(props, comparisonOptions, actual.intervalData);
    const untrimmed = offset(scale);
    const trimRange = trimIntervals
      ? getTrimRange(
          untrimmed.rows,
          untrimmed.totals.intervalData,
          balanceTypeOp,
        )
      : null;
    // The Comparison column follows the intervals left after trimming
    const { rows: untrimmedRows, totals: offsetTotals } = trimRange
      ? offset(
          getVisibleScale(
            scale,
            actual.intervalData,
            trimRange,
            props.interval,
          ),
        )
      : untrimmed;
    const totals = sumNetsFromRows(offsetTotals, untrimmedRows, groupBy);
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
      !!comparisonOptions.showAmounts,
    );

    // Series are coloured in the order shown, like reports without a comparison
    const legend = calculateLegend(
      intervalData,
      rows,
      groupBy,
      graphType,
      balanceTypeOp,
    );

    setData({
      ...totals,
      data: rows,
      intervalData,
      legend: colorLegend(legend, {
        groupBy,
        intervalData,
        balanceTypeOp,
        showAmounts: !!comparisonOptions.showAmounts,
      }),
      comparisonStartDate: comparisonOptions.startDate,
      comparisonEndDate: comparisonOptions.endDate,
    });
  };
}

export function createComparisonGroupedSpreadsheet(
  props: createCustomSpreadsheetProps,
  comparisonOptions: ComparisonOptions,
) {
  const {
    showEmpty,
    trimIntervals,
    balanceTypeOp = 'totalDebts',
    sortByOp = 'desc',
  } = props;
  const spreadsheetProps = getSpreadsheetProps(props, comparisonOptions);
  const getActual = createGroupedSpreadsheet(spreadsheetProps.actual);
  const getComparison = createGroupedSpreadsheet(spreadsheetProps.comparison);

  return async (
    spreadsheet: Spreadsheet,
    setData: (data: GroupedEntity[]) => void,
  ) => {
    const [actual = [], fetchedComparison = []] = await Promise.all([
      collect(getActual, spreadsheet),
      collect(getComparison, spreadsheet),
    ]);
    const comparison = comparisonOptions.budgeted
      ? rowsFromBudget(fetchedComparison)
      : fetchedComparison;

    const template = actual[0]?.intervalData ?? [];
    const offset = (scale: ComparisonScale) =>
      offsetRows(actual, comparison, {
        scale,
        template,
        showEmpty,
        balanceTypeOp,
        sortByOp,
        sortAmount: comparisonOptions.sortAmount ?? 'current',
      });

    const scale = getScale(props, comparisonOptions, template);
    const rows = offset(scale);
    if (!trimIntervals) {
      setData(rows);
      return;
    }

    // The Comparison column follows the intervals left after trimming
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
