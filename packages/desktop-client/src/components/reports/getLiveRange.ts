import * as monthUtils from 'loot-core/shared/months';
import { type TimeFrame } from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { ReportOptions } from './ReportOptions';
import { getSpecificRange, validateRange } from './reportRanges';

export function getLiveRange(
  cond: string,
  earliestTransaction: string,
  latestTransaction: string,
  includeCurrentInterval: boolean,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): [string, string, TimeFrame['mode']] {
  let dateStart = earliestTransaction;
  let today = monthUtils.currentDay();
  let dateEnd = latestTransaction;
  const rangeName = ReportOptions.dateRangeMap.get(cond);
  switch (rangeName) {
    case 'yearToDate':
      [dateStart, today] = validateRange(
        earliestTransaction,
        latestTransaction,
        monthUtils.getYearStart(monthUtils.currentMonth()) + '-01',
        monthUtils.currentDay(),
      );
      break;
    case 'lastYear':
      [dateStart, today] = validateRange(
        earliestTransaction,
        latestTransaction,
        monthUtils.getYearStart(
          monthUtils.prevYear(monthUtils.currentMonth()),
        ) + '-01',
        monthUtils.getYearEnd(monthUtils.prevYear(monthUtils.currentDate())) +
          '-31',
      );
      break;
    case 'priorYearToDate':
      [dateStart, today] = validateRange(
        earliestTransaction,
        latestTransaction,
        monthUtils.getYearStart(
          monthUtils.prevYear(monthUtils.currentMonth()),
        ) + '-01',
        monthUtils.prevYear(monthUtils.currentDate(), 'yyyy-MM-dd'),
      );
      break;
    case 'allTime':
      dateStart = earliestTransaction;
      dateEnd = latestTransaction;
      break;
    default:
      if (typeof rangeName === 'number') {
        [dateStart, today] = getSpecificRange(
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

  return [dateStart, today, 'sliding-window'];
}
