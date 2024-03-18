import * as monthUtils from 'loot-core/src/shared/months';

export function validateStart(
  earliest: string,
  start: string,
  end: string,
  interval: string,
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
    default:
      dateStart = start;
      addDays = 6;
      break;
  }

  if (end < start) {
    end = monthUtils.addDays(dateStart, addDays);
  }
  return boundedRange(earliest, dateStart, end, interval);
}

export function validateEnd(
  earliest: string,
  start: string,
  end: string,
  interval: string,
) {
  let subDays;
  let dateEnd;
  switch (interval) {
    case 'Monthly':
      dateEnd = end + '-31';
      subDays = 180;
      break;
    case 'Yearly':
      dateEnd = end + '-12-31';
      subDays = 1095;
      break;
    default:
      dateEnd = end;
      subDays = 6;
      break;
  }

  if (start > end) {
    start = monthUtils.subDays(dateEnd, subDays);
  }
  return boundedRange(earliest, start, dateEnd, interval);
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
  interval: string,
) {
  let latest;
  switch (interval) {
    case 'Monthly':
      latest = monthUtils.currentMonth() + '-31';
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
  return [start, end];
}

export function getSpecificRange(
  offset: number,
  addNumber: number,
  interval: string,
) {
  const currentDay = monthUtils.currentDay();
  let currInterval;
  let dateStart;
  let dateEnd;
  switch (interval) {
    case 'Monthly':
      currInterval = monthUtils.monthFromDate(currentDay);
      dateStart = monthUtils.subMonths(currInterval, offset);
      dateEnd = monthUtils.addMonths(
        dateStart,
        addNumber === null ? offset : addNumber,
      );
      break;
    default:
      currInterval = currentDay;
      dateStart = monthUtils.subDays(currInterval, offset);
      dateEnd = monthUtils.addDays(
        dateStart,
        addNumber === null ? offset : addNumber,
      );
      break;
  }
  return [dateStart, dateEnd];
}
