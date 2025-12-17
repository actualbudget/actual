import * as monthUtils from 'loot-core/shared/months';

function isMonthOnlyDate(s: string) {
  return s.includes('-') && s.split('-').length === 2;
}

function toMonth(dateOrMonth: string) {
  return isMonthOnlyDate(dateOrMonth)
    ? dateOrMonth
    : monthUtils.monthFromDate(dateOrMonth);
}

/**
 * Given a stored sliding-window start/end (which represent a window length),
 * return the live range anchored to the current day.
 *
 * Example: start=2024-01, end=2024-03 => 3-month window => liveStart is currentMonth-2.
 */
export function getLiveSlidingWindowRange(
  start: string,
  end: string,
  today: string = monthUtils.currentDay(),
) {
  const startMonth = toMonth(start);
  const endMonth = toMonth(end);
  const offset = monthUtils.differenceInCalendarMonths(endMonth, startMonth);

  const liveEndMonth = monthUtils.monthFromDate(today);
  const liveStartMonth = monthUtils.subMonths(liveEndMonth, offset);

  return {
    startDate: monthUtils.firstDayOfMonth(liveStartMonth),
    endDate: today,
  };
}
