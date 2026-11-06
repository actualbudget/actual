import * as monthUtils from '#shared/months';
import { getNextDateAfter } from '#shared/schedules';
import type { RecurConfig } from '#types/models';

export type ScheduleDatesOptions = {
  start: string;
  end?: string;
  count?: number;
};

/**
 * Expands a schedule date (a single date or a recurrence) into the dates it
 * falls on, as `YYYY-MM-DD` strings in ascending order.
 *
 * Each date is found with `getNextDateAfter`, the same step the app uses to
 * advance a schedule, so the result matches what the app shows: every
 * recurrence setting is honoured, the window applies to the dates after the
 * weekend move, and a date that several occurrences move onto (a daily
 * schedule's Saturday and Sunday both landing on Monday) is listed once.
 *
 * At least one of `end`, `count`, or an ending recurrence must bound the
 * result; an unbounded request throws.
 */
export function getScheduleDates(
  date: RecurConfig | string,
  { start, end, count }: ScheduleDatesOptions,
): string[] {
  if (count === 0) {
    return [];
  }

  if (typeof date === 'string') {
    return isWithin(date, start, end) ? [date] : [];
  }

  const isOpenEnded = date.endMode == null || date.endMode === 'never';
  if (end == null && count == null && isOpenEnded) {
    throw new Error(
      'An open-ended recurrence needs an `end` date or a `count` to be expanded',
    );
  }

  if (date.skipWeekend && date.weekendSolveMode == null) {
    throw new Error('`weekendSolveMode` is required when `skipWeekend` is set');
  }

  const dateCond = { op: 'is', field: 'date', value: date };
  const dates: string[] = [];

  let next = getNextDateAfter(dateCond, monthUtils.subDays(start, 1));
  while (next != null && (end == null || next <= end)) {
    dates.push(next);
    if (count != null && dates.length >= count) {
      break;
    }
    next = getNextDateAfter(dateCond, next);
  }

  return dates;
}

function isWithin(day: string, start: string, end: string | undefined) {
  return day >= start && (end == null || day <= end);
}
