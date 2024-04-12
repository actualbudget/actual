import * as monthUtils from 'loot-core/src/shared/months';

export function validateStart(
  earliest: string,
  start: string,
  end: string,
  interval?: string,
) {
  let addDays;
  let dateStart;
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
  );
}

export function validateEnd(
  earliest: string,
  start: string,
  end: string,
  interval?: string,
) {
  let subDays;
  let dateEnd;
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
) {
  let latest;
  switch (interval) {
    case 'Monthly':
      latest = monthUtils.currentMonth() + '-31';
      break;
    case 'Yearly':
      latest = monthUtils.currentDay();
      break;
    default:
      latest = monthUtils.currentMonth();
      break;
  }

  if (end > latest) {
    end = latest;
  }
  if (start < earliest) {
    start = earliest;
  }
  return [start, end];
}

export function getSpecificRange(offset: number, addNumber: number | null) {
  const currentDay = monthUtils.currentDay();
  const dateStart = monthUtils.subMonths(currentDay, offset) + '-01';
  const dateEnd = monthUtils.getMonthEnd(
    monthUtils.addMonths(dateStart, addNumber === null ? offset : addNumber) +
      '-01',
  );
  return [dateStart, dateEnd];
}

export function getFullRange(start: string) {
  const end = monthUtils.currentMonth();
  return [start, end];
}

export function getLatestRange(offset: number) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, offset);
  return [start, end];
}
