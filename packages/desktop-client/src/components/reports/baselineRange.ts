import * as monthUtils from '@actual-app/core/shared/months';
import type { CustomReportBaseline } from '@actual-app/core/types/models';
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
  barsFromBaseline: false,
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
