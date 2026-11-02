import * as monthUtils from '#shared/months';
import type { Weekday } from '#types/models/templates';

// Ordered to match `Date.prototype.getDay()` (0 = Sunday).
export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const satisfies readonly Weekday[];

export type WeeklyAverageWindow = {
  // First and last day of the window, both inclusive (YYYY-MM-DD).
  start: string;
  end: string;
  numWeeks: number;
};

// How many times `weekday` falls in `month` (YYYY-MM). Always 4 or 5.
export function countWeekdayInMonth(month: string, weekday: Weekday): number {
  const year = Number(month.slice(0, 4));
  const monthIndex = monthUtils.getMonthIndex(month);
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // Days from the 1st to the first occurrence of the target weekday.
  const offset = (WEEKDAYS.indexOf(weekday) - firstWeekday + 7) % 7;
  // Every month has 4 full weeks (28 days); the extra 0-3 days decide whether
  // the weekday appears a fifth time.
  return offset < daysInMonth - 28 ? 5 : 4;
}

// The averaging window is the `numWeeks` complete 7-day weeks immediately
// before the budget month starts. When the budget month hasn't started yet the
// window ends yesterday instead, so it never includes today (incomplete) or
// days in the future. This mirrors how the monthly average skips the current,
// incomplete month.
export function getWeeklyAverageWindow({
  month,
  numWeeks,
  today,
}: {
  month: string;
  numWeeks: number;
  today: string;
}): WeeklyAverageWindow {
  const monthStart = monthUtils.firstDayOfMonth(month);
  const endExclusive = monthStart < today ? monthStart : today;
  return {
    start: monthUtils.subDays(endExclusive, numWeeks * 7),
    end: monthUtils.subDays(endExclusive, 1),
    numWeeks,
  };
}

// Drops whole weeks from the start of the window that end before the
// category's first transaction, so a new category isn't averaged over weeks
// it didn't exist for. The week containing the first transaction is kept.
// Returns null when the category has no activity in the window.
export function trimWeeklyAverageWindow(
  window: WeeklyAverageWindow,
  firstActivityDate: string | null,
): WeeklyAverageWindow | null {
  if (firstActivityDate == null || firstActivityDate > window.end) {
    return null;
  }

  const daysWithActivity =
    monthUtils.differenceInCalendarDays(window.end, firstActivityDate) + 1;
  const numWeeks = Math.min(window.numWeeks, Math.ceil(daysWithActivity / 7));
  return {
    start: monthUtils.subDays(window.end, numWeeks * 7 - 1),
    end: window.end,
    numWeeks,
  };
}
