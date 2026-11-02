import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CustomReportBaseline,
  IntervalEntity,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { getLiveRange } from './getLiveRange';

// Six complete months, so a new baseline doesn't overlap the report's range
export const defaultBaseline: CustomReportBaseline = {
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
  changeFromBaseline: false,
  source: 'actual',
  mode: 'range',
  // The same days of the week, a year back
  offsetCount: 52,
  offsetUnit: 'weeks',
};

/**
 * The dates of a baseline, resolving live ranges against today. An offset
 * baseline covers the report's range, moved back by the offset.
 */
export function getBaselineRange(
  baseline: CustomReportBaseline,
  earliestTransaction: string,
  latestTransaction: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
  reportRange?: [string, string],
): [string, string] {
  if (isOffsetBaseline(baseline) && reportRange) {
    return shiftRange(...reportRange, getOffsetDays(baseline));
  }
  if (baseline.isDateStatic) {
    return [baseline.startDate, baseline.endDate];
  }

  const [start, end] = getLiveRange(
    baseline.dateRange,
    earliestTransaction,
    latestTransaction,
    baseline.includeCurrentInterval,
    firstDayOfWeekIdx,
  );
  return [start, end];
}

export function isOffsetBaseline(baseline: CustomReportBaseline) {
  return baseline.mode === 'offset';
}

/**
 * How many days an offset baseline looks back.
 */
export function getOffsetDays(baseline: CustomReportBaseline) {
  const count = baseline.offsetCount ?? defaultBaseline.offsetCount ?? 1;
  return baseline.offsetUnit === 'days' ? count : count * 7;
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
// against a budgeted baseline
const budgetedBaselineGroups = new Set(['Category', 'Group', 'Interval']);

export function canUseBudgetedBaseline(groupBy: string) {
  return budgetedBaselineGroups.has(groupBy);
}

/**
 * Whether a baseline compares against budgets, which only applies where the
 * report's grouping has budgets.
 */
export function isBudgetedBaseline(
  baseline: CustomReportBaseline,
  groupBy: string,
) {
  // Budgets are set per month, so an offset of days or weeks would have to
  // spread them over part months
  return (
    baseline.source === 'budgeted' &&
    !isOffsetBaseline(baseline) &&
    canUseBudgetedBaseline(groupBy)
  );
}

// Graphs that can draw changes from the baseline instead of amounts with the
// baseline drawn in. Tables always show both, and donuts can't draw negative
// changes, so they always compare amounts.
const baselineChangeGraphs = new Set([
  'BarGraph',
  'StackedBarGraph',
  'LineGraph',
  'AreaGraph',
]);

export function canShowBaselineChanges(graphType: string) {
  return baselineChangeGraphs.has(graphType);
}

// Each series in baseline interval data also carries its amount, change and
// baseline under these keys, whichever of them is drawn
function getSeriesKey(dataKey: string, suffix: string) {
  return `${dataKey}:${suffix}`;
}

export function getAmountKey(dataKey: string) {
  return getSeriesKey(dataKey, 'amount');
}

export function getChangeKey(dataKey: string) {
  return getSeriesKey(dataKey, 'change');
}

export function getBaselineKey(dataKey: string) {
  return getSeriesKey(dataKey, 'baseline');
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
