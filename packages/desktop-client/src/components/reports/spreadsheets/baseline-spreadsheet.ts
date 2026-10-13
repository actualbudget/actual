import { theme } from '@actual-app/components/theme';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  balanceTypeOpType,
  BaselineBreakdown,
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
  getBaselineKey,
  getFullIntervalDays,
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
};

// How baseline totals map onto the report's intervals
export type BaselineScale = {
  baselineDays: number;
  baselineIntervals: number;
  // Budgets are set per interval rather than accrued per day
  perInterval: boolean;
  projectToFullPeriod: boolean;
  // Average full length of the displayed intervals, for the Baseline column
  averageDays: number;
};

type BaselineContext = {
  scale: BaselineScale;
  template: IntervalEntity[];
  showEmpty: boolean;
  balanceTypeOp: balanceTypeOpType;
  sortByOp: sortByOpType;
  showAmounts: boolean;
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

/**
 * Offsets one interval by the baseline's average over the same length.
 */
export function offsetInterval(
  interval: IntervalEntity,
  baseline: ReportValues | undefined,
  scale: BaselineScale,
): IntervalEntity {
  const start = interval.intervalStartDate;
  const end = interval.intervalEndDate ?? start;
  // Report spreadsheets always date their intervals; without dates there's
  // no length to scale the baseline by
  if (!start || !end) {
    return interval;
  }

  // Intervals that haven't started have nothing to compare yet, so they stay
  // empty rather than showing the whole baseline as a change. Budgets are set
  // ahead of time, so theirs are still compared.
  const days = countDays(start, end);
  if (!scale.perInterval && isFuture(start)) {
    const zero = mapValues(() => 0);
    // Charts only draw the baseline ahead when the amount is projected there
    const upcoming = scale.projectToFullPeriod
      ? fromTotals(field =>
          Math.round(((baseline?.[field] ?? 0) * days) / scale.baselineDays),
        )
      : undefined;
    return {
      ...interval,
      ...zero,
      baseline: { expected: zero, actual: zero, upcoming },
    };
  }

  // An interval in progress is compared against the baseline over the days
  // that have passed. Projecting from its first few days is too unreliable,
  // so projections only cover the whole range.
  const share = scale.perInterval
    ? 1 / scale.baselineIntervals
    : countElapsedDays(start, end) / scale.baselineDays;

  const expected = fromTotals(field =>
    Math.round((baseline?.[field] ?? 0) * share),
  );
  const actual = fromTotals(field => interval[field]);

  return {
    ...interval,
    ...subtract(actual, expected),
    baseline: { expected, actual },
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
  return days > elapsedDays ? { days, scale: days / elapsedDays } : null;
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
  baseline: ReportValues | undefined,
  scale: BaselineScale,
): T & { baseline: BaselineBreakdown } {
  const intervalData = item.intervalData.map(interval =>
    offsetInterval(interval, baseline, scale),
  );
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
          ((baseline?.[field] ?? 0) * projection.days) / scale.baselineDays,
        ),
      )
    : sum(breakdown => breakdown.expected);
  const projected = projection
    ? fromTotals(field => Math.round(actual[field] * projection.scale))
    : undefined;
  const perIntervalShare = scale.perInterval
    ? 1 / scale.baselineIntervals
    : scale.averageDays / scale.baselineDays;
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
  const { scale, template, showEmpty, balanceTypeOp, sortByOp, showAmounts } =
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
        showAmounts
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
          : { balanceTypeOp, sortByOp, isSigned: true },
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
    if (!breakdown) {
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

      const key = row.id || row.name;
      if (showAmounts) {
        stacked[key] = getAmount(rowInterval);
        stacked[getBaselineKey(key)] = getBaseline(rowInterval);
      } else {
        // Changes are stacked as signed values, unlike spending which the
        // report spreadsheets flip so it points up
        stacked[key] = rowInterval[balanceTypeOp];
      }
    }

    return {
      date: interval.date,
      intervalStartDate: interval.intervalStartDate,
      intervalEndDate: interval.intervalEndDate,
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

// Changes are coloured by direction wherever a single series is coloured by
// its amount, and on donuts, whose slices only show the size of a change.
// Everything else keeps its category colours.
function colorLegend(
  legend: LegendEntity[],
  {
    groupBy,
    graphType,
    intervalData,
    rows,
    balanceTypeOp,
  }: {
    groupBy: string;
    graphType?: string;
    intervalData: IntervalEntity[];
    rows: GroupedEntity[];
    balanceTypeOp: balanceTypeOpType;
  },
): LegendEntity[] {
  if (groupBy === 'Interval') {
    return colorBySign(legend, intervalData, balanceTypeOp);
  }
  if (graphType === 'DonutGraph') {
    return colorBySign(legend, rows, balanceTypeOp);
  }
  return legend;
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
  const lengths = intervals.flatMap(({ intervalStartDate }) =>
    intervalStartDate ? [getFullIntervalDays(intervalStartDate, interval)] : [],
  );
  if (lengths.length === 0) {
    return 1;
  }
  return lengths.reduce((sum, days) => sum + days, 0) / lengths.length;
}

function getScale(
  props: createCustomSpreadsheetProps,
  baselineOptions: BaselineOptions,
  template: IntervalEntity[],
): BaselineScale {
  return {
    baselineDays: countElapsedDays(
      baselineOptions.startDate,
      baselineOptions.endDate,
    ),
    baselineIntervals: countIntervals(
      baselineOptions.startDate,
      baselineOptions.endDate,
      props.interval,
      props.firstDayOfWeekIdx,
    ),
    perInterval: props.balanceTypeOp === 'totalBudgeted',
    projectToFullPeriod: baselineOptions.projectToFullPeriod,
    averageDays: getAverageDays(template, props.interval),
  };
}

function getVisibleScale(
  scale: BaselineScale,
  template: IntervalEntity[],
  { startIndex, endIndex }: { startIndex: number; endIndex: number },
  interval: string,
): BaselineScale {
  return {
    ...scale,
    averageDays: getAverageDays(
      trimIntervalDataToRange(template, startIndex, endIndex),
      interval,
    ),
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
    },
  };
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
    const [actual, baseline] = await Promise.all([
      collect(getActual, spreadsheet),
      collect(getBaseline, spreadsheet),
    ]);
    if (!actual) {
      return;
    }

    const offset = (scale: BaselineScale) => ({
      rows: offsetRows(actual.data ?? [], baseline?.data ?? [], {
        scale,
        template: actual.intervalData,
        showEmpty,
        balanceTypeOp,
        sortByOp,
        showAmounts: !!baselineOptions.showAmounts,
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
        graphType,
        intervalData,
        rows,
        balanceTypeOp,
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
    const [actual = [], baseline = []] = await Promise.all([
      collect(getActual, spreadsheet),
      collect(getBaseline, spreadsheet),
    ]);

    const template = actual[0]?.intervalData ?? [];
    const offset = (scale: BaselineScale) =>
      offsetRows(actual, baseline, {
        scale,
        template,
        showEmpty,
        balanceTypeOp,
        sortByOp,
        showAmounts: !!baselineOptions.showAmounts,
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
