import * as monthUtils from '@actual-app/core/shared/months';
import type {
  ComparisonBreakdown,
  CustomReportComparison,
  CustomReportComparisonSortAmount,
  DataEntity,
  IntervalEntity,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { getLiveRange } from './getLiveRange';

// Six complete months, so a new comparison doesn't overlap the report's range
export const defaultComparison: CustomReportComparison = {
  enabled: false,
  dateRange: 'Last 6 months',
  isDateStatic: false,
  startDate: monthUtils.subMonths(monthUtils.currentMonth(), 6) + '-01',
  endDate: monthUtils.lastDayOfMonth(
    monthUtils.subMonths(monthUtils.currentMonth(), 1),
  ),
  includeCurrentInterval: false,
  projectToFullPeriod: true,
  showChanges: false,
  source: 'actual',
  mode: 'range',
  // The same days of the week, a year back
  offsetCount: 52,
  offsetUnit: 'weeks',
};

/**
 * The dates of a comparison, resolving live ranges against today. An offset
 * comparison covers the report's range, moved back by the offset.
 */
export function getComparisonRange(
  comparison: CustomReportComparison,
  earliestTransaction: string,
  latestTransaction: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
  reportRange?: [string, string],
): [string, string] {
  if (isOffsetComparison(comparison) && reportRange) {
    return shiftRange(...reportRange, getOffsetDays(comparison));
  }
  if (comparison.isDateStatic) {
    return [comparison.startDate, comparison.endDate];
  }

  const [start, end] = getLiveRange(
    comparison.dateRange,
    earliestTransaction,
    latestTransaction,
    comparison.includeCurrentInterval,
    firstDayOfWeekIdx,
  );
  return [start, end];
}

/**
 * The amount rows sort by. Rows sort by what is drawn unless another amount
 * is chosen.
 */
export function getComparisonSortAmount(
  comparison: CustomReportComparison,
  showAmounts: boolean,
): CustomReportComparisonSortAmount {
  return comparison.sortAmount ?? (showAmounts ? 'current' : 'change');
}

export function isOffsetComparison(comparison: CustomReportComparison) {
  return comparison.mode === 'offset';
}

/**
 * How many days an offset comparison looks back.
 */
export function getOffsetDays(comparison: CustomReportComparison) {
  const count = comparison.offsetCount ?? defaultComparison.offsetCount ?? 1;
  return comparison.offsetUnit === 'days' ? count : count * 7;
}

/**
 * A range moved back by a number of days. Interval starts can be month or
 * year strings.
 */
export function shiftRange(
  start: string,
  end: string,
  offsetDays: number,
): [string, string] {
  return [
    monthUtils.subDays(monthUtils.dayFromDate(start), offsetDays),
    monthUtils.subDays(monthUtils.dayFromDate(end), offsetDays),
  ];
}

// The longest an interval can be, in days
const longestIntervalDays: Record<string, number> = {
  Daily: 1,
  Weekly: 7,
  Monthly: 31,
  Quarterly: 92,
  Yearly: 366,
};

/**
 * Whether an offset is short enough that an interval's past window can
 * overlap the interval itself.
 */
export function isOffsetOverlapping(offsetDays: number, interval: string) {
  return offsetDays < (longestIntervalDays[interval] ?? 31);
}

/**
 * Days in a range, inclusive. Interval starts can be month or year strings.
 */
export function countDays(start: string, end: string) {
  return (
    monthUtils.differenceInCalendarDays(
      monthUtils.dayFromDate(end),
      monthUtils.dayFromDate(start),
    ) + 1
  );
}

/**
 * Days of a range that have already happened, and at least one.
 */
export function countElapsedDays(start: string, end: string) {
  const today = monthUtils.currentDay();
  const last = monthUtils.dayFromDate(end);
  return Math.max(countDays(start, last < today ? last : today), 1);
}

export function rangesOverlap(
  [startA, endA]: [string, string],
  [startB, endB]: [string, string],
) {
  return startA <= endB && startB <= endA;
}

/**
 * An interval's whole range, even when the report's range cuts it short.
 */
export function getFullIntervalRange(
  intervalStartDate: string,
  interval: string,
): [string, string] {
  switch (interval) {
    case 'Daily':
      return [intervalStartDate, intervalStartDate];
    case 'Weekly':
      return [intervalStartDate, monthUtils.addDays(intervalStartDate, 6)];
    case 'Quarterly': {
      const quarter = monthUtils.quarterFromDate(intervalStartDate);
      return [
        `${quarter}-01`,
        monthUtils.lastDayOfMonth(monthUtils.addMonths(quarter, 2)),
      ];
    }
    case 'Yearly': {
      const year = intervalStartDate.slice(0, 4);
      return [`${year}-01-01`, `${year}-12-31`];
    }
    default: {
      const month = intervalStartDate.slice(0, 7);
      return [`${month}-01`, monthUtils.lastDayOfMonth(month)];
    }
  }
}

/**
 * An interval's whole length in days, even when a range cuts it short.
 */
export function getFullIntervalDays(
  intervalStartDate: string,
  interval: string,
) {
  return countDays(...getFullIntervalRange(intervalStartDate, interval));
}

/**
 * An interval's whole length in months, even when a range cuts it short.
 */
export function getFullIntervalMonths(
  intervalStartDate: string,
  interval: string,
) {
  return countMonths(...getFullIntervalRange(intervalStartDate, interval));
}

/**
 * Months in a range, inclusive, with part months counted by their share of
 * days. Budgets are set per month, so this is how they're spread over a range.
 */
export function countMonths(start: string, end: string) {
  const first = monthUtils.dayFromDate(start);
  const last = monthUtils.dayFromDate(end);
  return monthUtils
    .rangeInclusive(monthUtils.getMonth(first), monthUtils.getMonth(last))
    .reduce((total, month) => {
      const monthStart = `${month}-01`;
      const monthEnd = monthUtils.lastDayOfMonth(month);
      const from = first > monthStart ? first : monthStart;
      const to = last < monthEnd ? last : monthEnd;
      return total + countDays(from, to) / countDays(monthStart, monthEnd);
    }, 0);
}

/**
 * Months of a range that have already happened, and at least one day's worth.
 */
export function countElapsedMonths(start: string, end: string) {
  const today = monthUtils.currentDay();
  const first = monthUtils.dayFromDate(start);
  const last = monthUtils.dayFromDate(end);
  const elapsedEnd = last < today ? last : today;
  return countMonths(first, elapsedEnd < first ? first : elapsedEnd);
}

// Budgets only exist per category, so other groupings have nothing to compare
// against a budgeted comparison
const budgetedComparisonGroups = new Set(['Category', 'Group', 'Interval']);

export function canUseBudgetedComparison(groupBy: string) {
  return budgetedComparisonGroups.has(groupBy);
}

/**
 * Whether a comparison compares against budgets, which only applies where the
 * report's grouping has budgets.
 */
export function isBudgetedComparison(
  comparison: CustomReportComparison,
  groupBy: string,
) {
  // Budgets are set per month, so an offset of days or weeks would have to
  // spread them over part months
  return (
    comparison.source === 'budgeted' &&
    !isOffsetComparison(comparison) &&
    canUseBudgetedComparison(groupBy)
  );
}

// Graphs that can draw changes from the comparison instead of amounts with the
// comparison drawn in. Tables always show both, and donuts can't draw negative
// changes, so they always compare amounts.
const comparisonChangeGraphs = new Set([
  'BarGraph',
  'StackedBarGraph',
  'LineGraph',
  'AreaGraph',
]);

export function canShowComparisonChanges(graphType: string) {
  return comparisonChangeGraphs.has(graphType);
}

// Each series in comparison interval data also carries its amount, change and
// comparison under these keys, whichever of them is drawn
function getSeriesKey(dataKey: string, suffix: string) {
  return `${dataKey}:${suffix}`;
}

export function getAmountKey(dataKey: string) {
  return getSeriesKey(dataKey, 'amount');
}

export function getChangeKey(dataKey: string) {
  return getSeriesKey(dataKey, 'change');
}

export function getComparisonKey(dataKey: string) {
  return getSeriesKey(dataKey, 'comparison');
}

/**
 * Whether an interval has started but not finished, so its amount is only
 * part of what it will be.
 */
export function isIntervalInProgress({
  intervalStartDate,
  intervalEndDate,
}: Pick<IntervalEntity, 'intervalStartDate' | 'intervalEndDate'>) {
  const today = monthUtils.currentDay();
  return (
    !!intervalStartDate &&
    !!intervalEndDate &&
    monthUtils.dayFromDate(intervalStartDate) <= today &&
    monthUtils.dayFromDate(intervalEndDate) > today
  );
}

/**
 * The dates a click on a comparison opens, like the table's Comparison cells:
 * an interval's own offset window, or else the whole comparison range. Budgets
 * and windows before the earliest transaction have no transactions to show.
 */
export function getComparisonDrilldownDates(
  data: Pick<DataEntity, 'comparisonStartDate' | 'comparisonEndDate'>,
  breakdown: ComparisonBreakdown | undefined,
  interval?: Pick<IntervalEntity, 'comparisonStartDate' | 'comparisonEndDate'>,
) {
  if (!breakdown || breakdown.budgeted || breakdown.noData) {
    return null;
  }
  const startDate = interval?.comparisonStartDate ?? data.comparisonStartDate;
  const endDate = interval?.comparisonEndDate ?? data.comparisonEndDate;
  return startDate && endDate ? { startDate, endDate } : null;
}
