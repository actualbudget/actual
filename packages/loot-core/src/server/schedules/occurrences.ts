import * as d from 'date-fns';

import { RSchedule } from '#server/util/rschedule';
import * as monthUtils from '#shared/months';
import {
  getDateWithSkippedWeekend,
  recurConfigToRSchedule,
} from '#shared/schedules';
import type { RecurConfig } from '#types/models';

export type ScheduleDatesOptions = {
  start: string;
  end?: string;
  count?: number;
};

// Moving an occurrence off a weekend shifts it by at most two days
// (Saturday to Monday, Sunday to Friday), so occurrences up to two days
// outside the window can land inside it once moved.
const MAX_WEEKEND_SHIFT_DAYS = 2;

/**
 * Expands a schedule date (a single date or a recurrence) into the dates it
 * falls on, as `YYYY-MM-DD` strings in ascending order.
 *
 * Every recurrence setting is honoured: frequency, interval, monthly
 * patterns (including "last day" and "last <weekday>"), end mode and the
 * weekend move (`skipWeekend` with `weekendSolveMode`). The window is applied
 * to the dates after the weekend move, so the result is exactly what the
 * schedule will show within `[start, end]`.
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

  const { skipWeekend, weekendSolveMode } = date;
  if (skipWeekend && weekendSolveMode == null) {
    throw new Error('`weekendSolveMode` is required when `skipWeekend` is set');
  }

  const schedule = new RSchedule({ rrules: recurConfigToRSchedule(date) });
  const occurrences = schedule.occurrences({
    start: d.startOfDay(
      monthUtils.parseDate(monthUtils.subDays(start, MAX_WEEKEND_SHIFT_DAYS)),
    ),
    end:
      end == null
        ? undefined
        : d.endOfDay(
            monthUtils.parseDate(
              monthUtils.addDays(end, MAX_WEEKEND_SHIFT_DAYS),
            ),
          ),
  });

  const dates: string[] = [];
  for (const occurrence of occurrences) {
    const moved =
      skipWeekend && weekendSolveMode
        ? getDateWithSkippedWeekend(occurrence.date, weekendSolveMode)
        : occurrence.date;
    const day = monthUtils.dayFromDate(moved);

    // Moved dates never go backwards, so the first one past `end` means
    // no later occurrence can fall inside the window either.
    if (end != null && day > end) {
      break;
    }
    if (day >= start) {
      dates.push(day);
      if (count != null && dates.length >= count) {
        break;
      }
    }
  }

  return dates;
}

function isWithin(day: string, start: string, end: string | undefined) {
  return day >= start && (end == null || day <= end);
}
