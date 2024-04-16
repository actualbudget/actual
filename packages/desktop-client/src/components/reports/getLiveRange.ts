import * as monthUtils from 'loot-core/src/shared/months';

import { ReportOptions } from './ReportOptions';
import { getSpecificRange, validateRange } from './reportRanges';

export function getLiveRange(
  cond: string,
  earliestTransaction: string,
  firstDayOfWeekIdx?: 0 | 1 | 2 | 3 | 4 | 5 | 6,
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

  return [dateStart, dateEnd];
}
