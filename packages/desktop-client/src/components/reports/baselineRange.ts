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
  showAmounts: false,
  changeFromBaseline: false,
};

/**
 * The dates of a baseline, resolving live ranges against today.
 */
export function getBaselineRange(
  baseline: CustomReportBaseline,
  earliestTransaction: string,
  latestTransaction: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): [string, string] {
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
 * An interval's whole length in days, even when a range cuts it short.
 */
export function getFullIntervalDays(
  intervalStartDate: string,
  interval: string,
) {
  switch (interval) {
    case 'Daily':
      return 1;
    case 'Weekly':
      return 7;
    case 'Yearly': {
      const year = intervalStartDate.slice(0, 4);
      return countDays(`${year}-01-01`, `${year}-12-31`);
    }
    default: {
      const month = intervalStartDate.slice(0, 7);
      return countDays(`${month}-01`, monthUtils.lastDayOfMonth(month));
    }
  }
}

// Graphs that can draw amounts against the baseline instead of changes
const baselineAmountGraphs = new Set([
  'BarGraph',
  'StackedBarGraph',
  'LineGraph',
  'AreaGraph',
]);

export function canShowBaselineAmounts(graphType: string) {
  return baselineAmountGraphs.has(graphType);
}

/**
 * The key of a series' baseline in stacked interval data, when amounts are
 * drawn against the baseline.
 */
export function getBaselineKey(dataKey: string) {
  return `${dataKey}${baselineKeySuffix}`;
}

const baselineKeySuffix = ':baseline';

/**
 * Whether a key holds a baseline drawn behind amounts, which tooltips leave
 * out since they list the baseline separately.
 */
export function isBaselineKey(key: string) {
  return key === 'baselineAmount' || key.endsWith(baselineKeySuffix);
}

/**
 * The series a baseline key belongs to.
 */
export function getSeriesKey(baselineKey: string) {
  return baselineKey.endsWith(baselineKeySuffix)
    ? baselineKey.slice(0, -baselineKeySuffix.length)
    : baselineKey;
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
