import * as monthUtils from 'loot-core/src/shared/months';

import { ReportOptions } from './ReportOptions';
import { getSpecificRange, validateRange } from './reportRanges';

export function getLiveRange(cond: string, earliestTransaction: string) {
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
    case 'allMonths':
      dateStart = earliestTransaction;
      dateEnd = monthUtils.currentDay();
      break;
    default:
      if (typeof rangeName === 'number') {
        [dateStart, dateEnd] = getSpecificRange(
          rangeName,
          cond === 'Last month' ? 0 : null,
        );
      } else {
        break;
      }
  }

  return [dateStart, dateEnd];
}
