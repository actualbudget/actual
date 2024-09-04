import * as monthUtils from 'loot-core/src/shared/months';
import { type TimeFrame } from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

export function validateStart(
  earliest: string,
  start: string,
  end: string,
  interval?: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): [string, string, TimeFrame['mode']] {
  let addDays: number;
  let dateStart: string;
  switch (interval) {
    case 'Monthly':
      dateStart = start + '-01';
      addDays = 180;
      break;
    case 'Yearly':
      dateStart = start + '-01-01';
      addDays = 1095;
      break;
    case 'Daily':
      dateStart = start;
      addDays = 6;
      break;
    default:
      dateStart = start;
      addDays = 180;
      break;
  }

  if (end < start) {
    end = monthUtils.addDays(dateStart, addDays);
  }
  return boundedRange(
    earliest,
    dateStart,
    interval ? end : monthUtils.monthFromDate(end),
    interval,
    firstDayOfWeekIdx,
  );
}

export function validateEnd(
  earliest: string,
  start: string,
  end: string,
  interval?: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): [string, string, TimeFrame['mode']] {
  let subDays: number;
  let dateEnd: string;
  switch (interval) {
    case 'Monthly':
      dateEnd = monthUtils.getMonthEnd(end + '-01');
      subDays = 180;
      break;
    case 'Yearly':
      dateEnd = end + '-12-31';
      subDays = 1095;
      break;
    case 'Daily':
      dateEnd = end;
      subDays = 6;
      break;
    default:
      dateEnd = end;
      subDays = 180;
      break;
  }

  if (start > end) {
    start = monthUtils.subDays(dateEnd, subDays);
  }
  return boundedRange(
    earliest,
    interval ? start : monthUtils.monthFromDate(start),
    dateEnd,
    interval,
    firstDayOfWeekIdx,
  );
}

export function validateRange(earliest: string, start: string, end: string) {
  const latest = monthUtils.currentDay();
  if (end > latest) {
    end = latest;
  }
  if (start < earliest) {
    start = earliest;
  }
  return [start, end];
}

function boundedRange(
  earliest: string,
  start: string,
  end: string,
  interval?: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): [string, string, 'static'] {
  let latest: string;
  switch (interval) {
    case 'Daily':
      latest = monthUtils.currentDay();
      break;
    case 'Weekly':
      latest = monthUtils.currentWeek(firstDayOfWeekIdx);
      break;
    case 'Monthly':
      latest = monthUtils.getMonthEnd(monthUtils.currentDay());
      break;
    case 'Yearly':
      latest = monthUtils.currentDay();
      break;
    default:
      latest = monthUtils.currentDay();
      break;
  }

  if (end > latest) {
    end = latest;
  }
  if (start < earliest) {
    start = earliest;
  }
  return [start, end, 'static'];
}

export function getSpecificRange(
  offset: number,
  addNumber: number | null,
  type?: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
) {
  const currentDay = monthUtils.currentDay();
  const currentWeek = monthUtils.currentWeek(firstDayOfWeekIdx);

  let dateStart = monthUtils.subMonths(currentDay, offset) + '-01';
  let dateEnd = monthUtils.getMonthEnd(
    monthUtils.addMonths(dateStart, addNumber === null ? offset : addNumber) +
      '-01',
  );

  if (type === 'Week') {
    dateStart = monthUtils.subWeeks(currentWeek, offset);
    dateEnd = monthUtils.getWeekEnd(
      monthUtils.addWeeks(dateStart, addNumber === null ? offset : addNumber),
      firstDayOfWeekIdx,
    );
  }

  return [dateStart, dateEnd, 'static'];
}

export function getFullRange(start: string) {
  const end = monthUtils.currentMonth();
  return [start, end, 'sliding-window'];
}

export function getLatestRange(offset: number) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, offset);
  return [start, end, 'sliding-window'];
}

export function calculateTimeRange(
  { start, end, mode }: TimeFrame = {
    start: monthUtils.subMonths(monthUtils.currentMonth(), 5),
    end: monthUtils.currentMonth(),
    mode: 'sliding-window',
  },
) {
  if (mode === 'sliding-window') {
    return getLatestRange(monthUtils.differenceInCalendarMonths(end, start));
  }

  return [start, end];
}
