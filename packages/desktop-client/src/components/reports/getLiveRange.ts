import * as monthUtils from 'loot-core/shared/months';
import { type TimeFrame } from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { ReportOptions } from './ReportOptions';
import { getSpecificRange, validateRange } from './reportRanges';

export function getLiveRange(
  cond: string,
  earliestTransaction: string,
  includeCurrentInterval: boolean,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): [string, string, TimeFrame['mode']] {
  let dateStart = earliestTransaction;
  let dateEnd = monthUtils.currentDay();
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
    case 'priorYearToDate':
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(
          monthUtils.prevYear(monthUtils.currentMonth()),
        ) + '-01',
        monthUtils.prevYear(monthUtils.currentDate(), 'yyyy-MM-dd'),
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
          ['This month', 'This week'].includes(cond)
            ? null
            : rangeName - (includeCurrentInterval ? 0 : 1),
          ReportOptions.dateRangeType.get(cond),
          firstDayOfWeekIdx,
        );
      } else {
        break;
      }
  }

  return [dateStart, dateEnd, 'sliding-window'];
}
