import * as monthUtils from 'loot-core/shared/months';

function isMonthString(dateOrMonth: string) {
  // Month format: YYYY-MM
  return dateOrMonth.split('-').length === 2;
}

/**
 * Query formulas use day-level filtering in AQL (`$gte/$lte` on YYYY-MM-DD).
 * The query editor UI selects months, so we normalize month strings to days.
 */
export function normalizeQueryTimeFrameStart(dateOrMonth: string) {
  return isMonthString(dateOrMonth)
    ? monthUtils.firstDayOfMonth(dateOrMonth)
    : monthUtils.dayFromDate(dateOrMonth);
}

export function normalizeQueryTimeFrameEnd(dateOrMonth: string) {
  return isMonthString(dateOrMonth)
    ? monthUtils.lastDayOfMonth(dateOrMonth)
    : monthUtils.dayFromDate(dateOrMonth);
}
