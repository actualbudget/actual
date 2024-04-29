import * as monthUtils from 'loot-core/src/shared/months';
import type { DateLike } from 'loot-core/src/shared/months';
import { type LocalPrefs } from 'loot-core/types/prefs';

import { ReportOptions } from './ReportOptions';
import { getSpecificRange, validateRange } from './reportRanges';

export function getLiveRange(
  cond: string,
  earliestTransaction: string,
  firstDayOfWeekIdx?: LocalPrefs['firstDayOfWeekIdx'],
  excludeCurrentPeriod?: boolean,
  interval?: string,
) {
  let dateStart;
  let dateEnd;
  const rangeName = ReportOptions.dateRangeMap.get(cond);
  switch (rangeName) {
    case 'yearToDate':
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(monthUtils.currentMonth()) + '-01',
        monthUtils.currentDay(),
      );
      break;
    case 'lastYear':
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(
          monthUtils.prevYear(monthUtils.currentMonth()),
        ) + '-01',
        monthUtils.getYearEnd(monthUtils.prevYear(monthUtils.currentDate())) +
          '-31',
      );
      break;
    case 'allTime':
      dateStart = earliestTransaction;
      dateEnd = monthUtils.currentDay();
      break;
    default:
      if (typeof rangeName === 'number') {
        [dateStart, dateEnd] = getSpecificRange(
          rangeName,
          cond === 'Last month' || cond === 'Last week' ? 0 : null,
          ReportOptions.dateRangeType.get(cond),
          firstDayOfWeekIdx,
        );
      } else {
        break;
      }
  }


  if(excludeCurrentPeriod === true) {
    const generalDateTest: (cond: string) => boolean = c => c === 'Year to date' || c === 'All time' || /^Last (\d+ months)$/.test(c);
    let dateSubFn: (instant: DateLike, offset: number) => string;
    let dateDiffFn: (date1: DateLike, date2: DateLike) => number;
    let condTestFn: (cond: string) => boolean = () => false;
    
    if(interval === 'Daily') {
      dateSubFn = monthUtils.subDays;
      dateDiffFn = monthUtils.differenceInCalendarDays;
      condTestFn = c => !/^Last (week|month|year)$/.test(c);
    } else if(interval === 'Weekly') {
      dateSubFn = monthUtils.subWeeks;
      dateDiffFn = (a, b) => Math.ceil(monthUtils.differenceInCalendarDays(a, b) / 7);
      condTestFn = c => c === 'This month' || generalDateTest(c);
    } else if(interval === 'Monthly') {
      dateSubFn = monthUtils.subMonths;
      dateDiffFn = monthUtils.differenceInCalendarMonths;
      condTestFn = generalDateTest;
    }

   if(cond && condTestFn(cond)) {
      if(cond !== 'Year to date') {
        dateStart = dateSubFn(dateStart, 1);
      }
      if(dateDiffFn(dateEnd, dateStart) > 1) {
        dateEnd = dateSubFn(dateEnd, 1);
      }
   }
  }

  return [dateStart, dateEnd];
}
