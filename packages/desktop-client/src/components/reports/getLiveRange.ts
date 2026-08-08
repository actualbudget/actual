import * as monthUtils from '@actual-app/core/shared/months';
import type { TimeFrame } from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { ReportOptions } from './ReportOptions';
import { getSpecificRange, validateRange } from './reportRanges';

export function getLiveRange(
  cond: string,
  earliestTransaction: string,
  latestTransaction: string,
  includeCurrentInterval: boolean,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
  referenceDate = monthUtils.currentDay(),
): [string, string, TimeFrame['mode']] {
  let dateStart = earliestTransaction;
  let dateEnd = latestTransaction;
  const rangeName = ReportOptions.dateRangeMap.get(cond);
  switch (rangeName) {
    case 'yearToDate': {
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(referenceDate) + '-01',
        referenceDate,
      );
      break;
    }
    case 'lastMonth': {
      const prevMonth = monthUtils.subMonths(referenceDate, 1);
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.firstDayOfMonth(prevMonth),
        monthUtils.lastDayOfMonth(prevMonth),
      );
      break;
    }
    case 'lastYear': {
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(monthUtils.prevYear(referenceDate)) + '-01',
        monthUtils.getYearEnd(monthUtils.prevYear(referenceDate)) + '-31',
      );
      break;
    }
    case 'priorYearToDate': {
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(monthUtils.prevYear(referenceDate)) + '-01',
        monthUtils.prevYear(referenceDate, 'yyyy-MM-dd'),
      );
      break;
    }
    case 'last30Days': {
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.subDays(referenceDate, 29),
        referenceDate,
      );
      break;
    }
    case 'allTime': {
      dateStart = earliestTransaction;
      dateEnd = latestTransaction;
      break;
    }
    default:
      if (typeof rangeName === 'number') {
        [dateStart, dateEnd] = getSpecificRange(
          rangeName,
          ['This month', 'This week'].includes(cond)
            ? null
            : rangeName - (includeCurrentInterval ? 0 : 1),
          ReportOptions.dateRangeType.get(cond),
          firstDayOfWeekIdx,
          referenceDate,
        );
      } else {
        break;
      }
  }

  return [dateStart, dateEnd, 'sliding-window'];
}
