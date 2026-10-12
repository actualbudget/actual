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

import { countDays, countElapsedDays } from '#components/reports/baselineRange';
import { ReportOptions } from '#components/reports/ReportOptions';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';

import { calculateLegend } from './calculateLegend';
import { createCustomSpreadsheet } from './custom-spreadsheet';
import type { createCustomSpreadsheetProps } from './custom-spreadsheet';
import { filterEmptyRows } from './filterEmptyRows';
import { createGroupedSpreadsheet } from './grouped-spreadsheet';
import { sortData } from './sortData';

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

export type BaselineDates = {
  startDate: string;
  endDate: string;
  projectToFullPeriod: boolean;
};

// How baseline totals map onto the report's intervals
export type BaselineScale = {
  baselineDays: number;
  baselineIntervals: number;
  // Budgets are set per interval rather than accrued per day
  perInterval: boolean;
  projectToFullPeriod: boolean;
  // Average length of the report's intervals, for the single baseline figure
  averageDays: number;
};

type BaselineContext = {
  scale: BaselineScale;
  template: IntervalEntity[];
  showEmpty: boolean;
  balanceTypeOp: balanceTypeOpType;
  sortByOp: sortByOpType;
};

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
  const start = interval.intervalStartDate || interval.date;
  const end = interval.intervalEndDate || start;

  // Intervals that haven't started have nothing to compare yet, so they stay
  // empty rather than showing the whole baseline as a change. Budgets are set
  // ahead of time, so theirs are still compared.
  if (!scale.perInterval && isFuture(start)) {
    const zero = mapValues(() => 0);
    return { ...interval, ...zero, baseline: { expected: zero, actual: zero } };
  }

  const days = countDays(start, end);
  const share = scale.perInterval
    ? 1 / scale.baselineIntervals
    : days / scale.baselineDays;
  const projection =
    !scale.perInterval && scale.projectToFullPeriod
      ? days / countElapsedDays(start, end)
      : 1;

  const expected = fromTotals(field =>
    Math.round((baseline?.[field] ?? 0) * share),
  );
  const actual = fromTotals(field => interval[field]);
  const projected =
    projection === 1
      ? undefined
      : fromTotals(field => Math.round(actual[field] * projection));

  return {
    ...interval,
    ...subtract(projected ?? actual, expected),
    baseline: { expected, actual, projected },
  };
}

function isFuture(date: string) {
  return monthUtils.dayFromDate(date) > monthUtils.currentDay();
}

// The whole range a row's intervals cover, for projecting its total
function getProjection(intervals: IntervalEntity[], scale: BaselineScale) {
  const first = intervals[0];
  const last = intervals[intervals.length - 1];
  if (!scale.projectToFullPeriod || scale.perInterval || !first || !last) {
    return null;
  }

  const start = first.intervalStartDate || first.date;
  const end = last.intervalEndDate || last.intervalStartDate || last.date;
  const days = countDays(start, end);
  const elapsedDays = countElapsedDays(start, end);
  return days > elapsedDays ? { days, scale: days / elapsedDays } : null;
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
  const { scale, template, showEmpty, balanceTypeOp, sortByOp } = context;
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
    .sort(sortData({ balanceTypeOp, sortByOp, isSigned: true }));
}

function stackIntervals(
  intervals: IntervalEntity[],
  rows: GroupedEntity[],
  balanceTypeOp: balanceTypeOpType,
): IntervalEntity[] {
  return intervals.map((interval, index) => {
    const stacked: Record<string, number> = {};
    for (const row of rows) {
      const rowInterval = row.intervalData[index];
      if (rowInterval) {
        // Changes are stacked as signed values, unlike spending which the report
        // spreadsheets flip so it points up
        stacked[row.id || row.name] = rowInterval[balanceTypeOp];
      }
    }

    return {
      date: interval.date,
      intervalStartDate: interval.intervalStartDate,
      intervalEndDate: interval.intervalEndDate,
      ...mapValues(field => interval[field]),
      baseline: interval.baseline,
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

export function getAverageDays(intervals: IntervalEntity[]) {
  if (intervals.length === 0) {
    return 1;
  }
  const total = intervals.reduce(
    (sum, interval) =>
      sum +
      countDays(
        interval.intervalStartDate || interval.date,
        interval.intervalEndDate || interval.intervalStartDate || interval.date,
      ),
    0,
  );
  return total / intervals.length;
}

function getScale(
  props: createCustomSpreadsheetProps,
  baselineDates: BaselineDates,
  template: IntervalEntity[],
): BaselineScale {
  return {
    baselineDays: countElapsedDays(
      baselineDates.startDate,
      baselineDates.endDate,
    ),
    baselineIntervals: countIntervals(
      baselineDates.startDate,
      baselineDates.endDate,
      props.interval,
      props.firstDayOfWeekIdx,
    ),
    perInterval: props.balanceTypeOp === 'totalBudgeted',
    projectToFullPeriod: baselineDates.projectToFullPeriod,
    averageDays: getAverageDays(template),
  };
}

// Empty rows are filtered after offsetting, once both ranges are known
function getSpreadsheetProps(
  props: createCustomSpreadsheetProps,
  baselineDates: BaselineDates,
) {
  const actual = { ...props, showEmpty: true };
  return {
    actual,
    baseline: {
      ...actual,
      startDate: baselineDates.startDate,
      endDate: baselineDates.endDate,
      trimIntervals: false,
    },
  };
}

export function createBaselineSpreadsheet(
  props: createCustomSpreadsheetProps,
  baselineDates: BaselineDates,
) {
  const {
    showEmpty,
    balanceTypeOp = 'totalDebts',
    sortByOp = 'desc',
    groupBy = '',
    graphType,
  } = props;
  const spreadsheetProps = getSpreadsheetProps(props, baselineDates);
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

    const scale = getScale(props, baselineDates, actual.intervalData);
    const rows = offsetRows(actual.data ?? [], baseline?.data ?? [], {
      scale,
      template: actual.intervalData,
      showEmpty,
      balanceTypeOp,
      sortByOp,
    });
    const totals = offsetItem(actual, baseline, scale);
    const intervalData = stackIntervals(
      totals.intervalData,
      rows,
      balanceTypeOp,
    );

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
        graphType,
        intervalData,
        rows,
        balanceTypeOp,
      }),
      baselineStartDate: baselineDates.startDate,
      baselineEndDate: baselineDates.endDate,
    });
  };
}

export function createBaselineGroupedSpreadsheet(
  props: createCustomSpreadsheetProps,
  baselineDates: BaselineDates,
) {
  const { showEmpty, balanceTypeOp = 'totalDebts', sortByOp = 'desc' } = props;
  const spreadsheetProps = getSpreadsheetProps(props, baselineDates);
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
    setData(
      offsetRows(actual, baseline, {
        scale: getScale(props, baselineDates, template),
        template,
        showEmpty,
        balanceTypeOp,
        sortByOp,
      }),
    );
  };
}
