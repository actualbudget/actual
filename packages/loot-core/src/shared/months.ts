// @ts-strict-ignore
import * as d from 'date-fns';
import { Locale } from 'date-fns';
import memoizeOne from 'memoize-one';

import { type SyncedPrefs } from '../types/prefs';

import { parseDate as sharedParseDate } from './date-utils';

// ----------------------------------------------
// Extended months: Pay Period Support (MM 13-99)
// ----------------------------------------------
import {
  type PayPeriodConfig,
  getPayPeriodConfig,
  setPayPeriodConfig,
  isPayPeriod as _isPayPeriod,
  getPayPeriodStartDate,
  getPayPeriodEndDate,
  getPayPeriodLabel,
  generatePayPeriods,
  nextPayPeriod,
  prevPayPeriod,
  addPayPeriods,
  getCurrentPayPeriod,
  getPayPeriodFromDate,
  generatePayPeriodRange,
  getPayPeriodNumberInMonth,
} from './pay-periods';
import * as Platform from './platform';

type DateLike = string | Date;
type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function _parse(value: DateLike): Date {
  // Use shared date parsing utility to avoid duplication
  return sharedParseDate(value);
}

export const parseDate = _parse;

export function yearFromDate(date: DateLike): string {
  return d.format(_parse(date), 'yyyy');
}

export function monthFromDate(date: DateLike): string {
  const config = getPayPeriodConfig();
  if (config?.enabled) {
    return getPayPeriodFromDate(_parse(date), config);
  }

  return d.format(_parse(date), 'yyyy-MM');
}

export function weekFromDate(
  date: DateLike,
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'],
): string {
  const converted = parseInt(firstDayOfWeekIdx || '0') as Day;
  return d.format(
    _parse(d.startOfWeek(_parse(date), { weekStartsOn: converted })),
    'yyyy-MM-dd',
  );
}

export function firstDayOfMonth(date: DateLike): string {
  return dayFromDate(d.startOfMonth(_parse(date)));
}

export function lastDayOfMonth(date: DateLike): string {
  return dayFromDate(d.endOfMonth(_parse(date)));
}

export function dayFromDate(date: DateLike): string {
  return d.format(_parse(date), 'yyyy-MM-dd');
}

export function currentMonth(): string {
  if (global.IS_TESTING || Platform.isPlaywright) {
    return global.currentMonth || '2017-01';
  }

  const config = getPayPeriodConfig();
  if (config?.enabled) {
    return getCurrentPayPeriod(new Date(), config);
  }

  return d.format(new Date(), 'yyyy-MM');
}

export function currentWeek(
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): string {
  if (global.IS_TESTING || Platform.isPlaywright) {
    return global.currentWeek || '2017-01-01';
  } else {
    const converted = parseInt(firstDayOfWeekIdx || '0') as Day;
    return d.format(
      _parse(d.startOfWeek(new Date(), { weekStartsOn: converted })),
      'yyyy-MM-dd',
    );
  }
}

export function currentYear(): string {
  if (global.IS_TESTING || Platform.isPlaywright) {
    return global.currentMonth || '2017';
  } else {
    return d.format(new Date(), 'yyyy');
  }
}

export function currentDate(): Date {
  if (global.IS_TESTING || Platform.isPlaywright) {
    return d.parse(currentDay(), 'yyyy-MM-dd', new Date());
  }

  return new Date();
}

export function currentDay(): string {
  if (global.IS_TESTING || Platform.isPlaywright) {
    return '2017-01-01';
  } else {
    return d.format(new Date(), 'yyyy-MM-dd');
  }
}

export function nextMonth(month: DateLike): string {
  const monthStr =
    typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');

  if (isPayPeriod(monthStr)) {
    return nextPayPeriod(monthStr);
  }

  return d.format(d.addMonths(_parse(month), 1), 'yyyy-MM');
}

export function prevYear(month: DateLike, format = 'yyyy-MM'): string {
  return d.format(d.subMonths(_parse(month), 12), format);
}

export function prevMonth(month: DateLike): string {
  const monthStr =
    typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');

  if (isPayPeriod(monthStr)) {
    return prevPayPeriod(monthStr);
  }

  return d.format(d.subMonths(_parse(month), 1), 'yyyy-MM');
}

export function addYears(year: DateLike, n: number): string {
  return d.format(d.addYears(_parse(year), n), 'yyyy');
}

export function addMonths(month: DateLike, n: number): string {
  const monthStr =
    typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');

  if (isPayPeriod(monthStr)) {
    return addPayPeriods(monthStr, n);
  }

  return d.format(d.addMonths(_parse(month), n), 'yyyy-MM');
}

export function addWeeks(date: DateLike, n: number): string {
  return d.format(d.addWeeks(_parse(date), n), 'yyyy-MM-dd');
}

export function differenceInCalendarMonths(
  month1: DateLike,
  month2: DateLike,
): number {
  return d.differenceInCalendarMonths(_parse(month1), _parse(month2));
}

export function differenceInCalendarDays(
  month1: DateLike,
  month2: DateLike,
): number {
  return d.differenceInCalendarDays(_parse(month1), _parse(month2));
}

export function subMonths(month: string | Date, n: number) {
  const monthStr =
    typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');

  if (isPayPeriod(monthStr)) {
    return addPayPeriods(monthStr, -n);
  }

  return d.format(d.subMonths(_parse(month), n), 'yyyy-MM');
}

export function subWeeks(date: DateLike, n: number): string {
  return d.format(d.subWeeks(_parse(date), n), 'yyyy-MM-dd');
}

export function subYears(year: string | Date, n: number) {
  return d.format(d.subYears(_parse(year), n), 'yyyy');
}

export function addDays(day: DateLike, n: number): string {
  return d.format(d.addDays(_parse(day), n), 'yyyy-MM-dd');
}

export function subDays(day: DateLike, n: number): string {
  return d.format(d.subDays(_parse(day), n), 'yyyy-MM-dd');
}

export function isBefore(month1: DateLike, month2: DateLike): boolean {
  const str1 =
    typeof month1 === 'string' ? month1 : d.format(_parse(month1), 'yyyy-MM');
  const str2 =
    typeof month2 === 'string' ? month2 : d.format(_parse(month2), 'yyyy-MM');

  // Handle mixed month types - pay periods vs calendar months
  const isPP1 = isPayPeriod(str1);
  const isPP2 = isPayPeriod(str2);

  if (isPP1 !== isPP2) {
    // Mixed types: prevent comparison by throwing early with context
    throw new Error(
      `Cannot compare mixed month types: '${str1}' (${isPP1 ? 'pay period' : 'calendar month'}) ` +
        `vs '${str2}' (${isPP2 ? 'pay period' : 'calendar month'}). ` +
        `Ensure consistent month types before comparison.`,
    );
  }

  // Same types: use appropriate comparison
  if (isPP1) {
    // For pay periods, use string comparison (works because format is YYYY-MM)
    return str1 < str2;
  } else {
    // For calendar months, use date parsing
    return d.isBefore(_parse(month1), _parse(month2));
  }
}

export function isAfter(month1: DateLike, month2: DateLike): boolean {
  const str1 =
    typeof month1 === 'string' ? month1 : d.format(_parse(month1), 'yyyy-MM');
  const str2 =
    typeof month2 === 'string' ? month2 : d.format(_parse(month2), 'yyyy-MM');

  const isPP1 = isPayPeriod(str1);
  const isPP2 = isPayPeriod(str2);

  if (isPP1 !== isPP2) {
    throw new Error(
      `Cannot compare mixed month types: '${str1}' (${isPP1 ? 'pay period' : 'calendar month'}) ` +
        `vs '${str2}' (${isPP2 ? 'pay period' : 'calendar month'}). ` +
        `Ensure consistent month types before comparison.`,
    );
  }

  if (isPP1) {
    return str1 > str2;
  } else {
    return d.isAfter(_parse(month1), _parse(month2));
  }
}

export function isCurrentMonth(month: DateLike): boolean {
  const monthStr =
    typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');
  return monthStr === currentMonth();
}

export function isCurrentDay(day: DateLike): boolean {
  return day === currentDay();
}

// TODO: This doesn't really fit in this module anymore, should
// probably live elsewhere
export function bounds(month: DateLike): { start: number; end: number } {
  const monthStr =
    typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');

  // Check if this is a pay period month
  if (isPayPeriod(monthStr)) {
    // The presence of pay period ID IS proof that pay periods are enabled
    const config = getPayPeriodConfig();
    if (!config) {
      throw new Error(
        `Pay period config not available for '${monthStr}'. This should not happen during normal operation.`,
      );
    }

    const year = parseInt(monthStr.slice(0, 4));
    const periodIndex = parseInt(monthStr.slice(5, 7)) - 12; // Convert 13-99 to 1-87

    if (periodIndex >= 1) {
      const periods = generatePayPeriods(year, config);
      const period = periods.find(p => p.monthId === monthStr);

      if (period) {
        console.log(`[PayPeriod] Bounds for pay period ${monthStr}:`, {
          startDate: period.startDate,
          endDate: period.endDate,
        });

        return {
          start: parseInt(period.startDate.replace(/-/g, '')),
          end: parseInt(period.endDate.replace(/-/g, '')),
        };
      }
    }

    throw new Error(
      `Pay period '${monthStr}' not found in generated periods for year ${year}. ` +
        `This may indicate an invalid pay period configuration.`,
    );
  }

  // Original calendar month logic
  return {
    start: parseInt(d.format(d.startOfMonth(_parse(month)), 'yyyyMMdd')),
    end: parseInt(d.format(d.endOfMonth(_parse(month)), 'yyyyMMdd')),
  };
}

export function _yearRange(
  start: DateLike,
  end: DateLike,
  inclusive = false,
): string[] {
  const years: string[] = [];
  let year = yearFromDate(start);
  const endYear = yearFromDate(end);
  while (d.isBefore(_parse(year), _parse(endYear))) {
    years.push(year);
    year = addYears(year, 1);
  }

  if (inclusive) {
    years.push(year);
  }

  return years;
}

export function yearRangeInclusive(start: DateLike, end: DateLike): string[] {
  return _yearRange(start, end, true);
}

export function _weekRange(
  start: DateLike,
  end: DateLike,
  inclusive = false,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): string[] {
  const weeks: string[] = [];
  let week = weekFromDate(start, firstDayOfWeekIdx);
  const endWeek = weekFromDate(end, firstDayOfWeekIdx);
  while (d.isBefore(_parse(week), _parse(endWeek))) {
    weeks.push(week);
    week = addWeeks(week, 1);
  }

  if (inclusive) {
    weeks.push(week);
  }

  return weeks;
}

export function weekRangeInclusive(
  start: DateLike,
  end: DateLike,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): string[] {
  return _weekRange(start, end, true, firstDayOfWeekIdx);
}

export function _range(
  start: DateLike,
  end: DateLike,
  inclusive = false,
): string[] {
  const startStr =
    typeof start === 'string' ? start : d.format(_parse(start), 'yyyy-MM');
  const endStr =
    typeof end === 'string' ? end : d.format(_parse(end), 'yyyy-MM');

  // Check if we're dealing with pay periods
  const startIsPayPeriod = isPayPeriod(startStr);
  const endIsPayPeriod = isPayPeriod(endStr);

  // First, prevent mixed ranges - both start and end must be pay periods or both must be calendar months
  if (startIsPayPeriod !== endIsPayPeriod) {
    throw new Error(
      `Mixed calendar month and pay period ranges are not allowed. ` +
        `Range from '${startStr}' (${startIsPayPeriod ? 'pay period' : 'calendar month'}) ` +
        `to '${endStr}' (${endIsPayPeriod ? 'pay period' : 'calendar month'}) is invalid. ` +
        `Use either all calendar months (e.g., '2024-01' to '2024-03') or all pay periods (e.g., '2024-13' to '2024-15').`,
    );
  }

  if (startIsPayPeriod || endIsPayPeriod) {
    // Both are pay periods - generate pay period range directly
    // The presence of pay period IDs IS proof that pay periods are enabled
    const result = generatePayPeriodRange(startStr, endStr, inclusive);
    console.log('[PayPeriod] Generated pay period range:', result);
    return result;
  }

  // Original calendar month logic
  const months: string[] = [];
  let month = monthFromDate(start);
  const endMonth = monthFromDate(end);
  while (d.isBefore(_parse(month), _parse(endMonth))) {
    months.push(month);
    month = addMonths(month, 1);
  }

  if (inclusive) {
    months.push(month);
  }

  return months;
}

export function range(start: DateLike, end: DateLike): string[] {
  return _range(start, end);
}

// Helper functions for mixed range handling
function findFirstPayPeriodForCalendarMonth(
  calendarMonth: string,
  config: PayPeriodConfig,
): string {
  const year = parseInt(calendarMonth.slice(0, 4));
  const periods = generatePayPeriods(year, config);

  // Find the first pay period that starts in or overlaps with this calendar month
  const monthStart = d.startOfMonth(parseDate(calendarMonth + '-01'));
  const monthEnd = d.endOfMonth(monthStart);

  for (const period of periods) {
    const periodStart = parseDate(period.startDate);
    const periodEnd = parseDate(period.endDate);

    // Check if this pay period overlaps with the calendar month
    if (
      d.isWithinInterval(periodStart, { start: monthStart, end: monthEnd }) ||
      d.isWithinInterval(monthStart, { start: periodStart, end: periodEnd })
    ) {
      return period.monthId;
    }
  }

  // Fallback: return the first pay period of the year
  return periods[0]?.monthId || `${year}-13`;
}

function findLastPayPeriodForCalendarMonth(
  calendarMonth: string,
  config: PayPeriodConfig,
): string {
  const year = parseInt(calendarMonth.slice(0, 4));
  const periods = generatePayPeriods(year, config);

  // Find the last pay period that starts in or overlaps with this calendar month
  const monthStart = d.startOfMonth(parseDate(calendarMonth + '-01'));
  const monthEnd = d.endOfMonth(monthStart);

  let lastMatchingPeriod = periods[periods.length - 1]?.monthId || `${year}-99`;

  for (const period of periods) {
    const periodStart = parseDate(period.startDate);
    const periodEnd = parseDate(period.endDate);

    // Check if this pay period overlaps with the calendar month
    if (
      d.isWithinInterval(periodStart, { start: monthStart, end: monthEnd }) ||
      d.isWithinInterval(monthStart, { start: periodStart, end: periodEnd })
    ) {
      lastMatchingPeriod = period.monthId;
    }
  }

  return lastMatchingPeriod;
}

export function rangeInclusive(start: DateLike, end: DateLike): string[] {
  return _range(start, end, true);
}

export function _dayRange(
  start: DateLike,
  end: DateLike,
  inclusive = false,
): string[] {
  const days: string[] = [];
  let day = start;
  while (d.isBefore(_parse(day), _parse(end))) {
    days.push(dayFromDate(day));
    day = addDays(day, 1);
  }

  if (inclusive) {
    days.push(dayFromDate(day));
  }

  return days;
}

export function dayRange(start: DateLike, end: DateLike) {
  return _dayRange(start, end);
}

export function dayRangeInclusive(start: DateLike, end: DateLike) {
  return _dayRange(start, end, true);
}

export function getMonthFromIndex(year: string, monthIndex: number) {
  const formatMonth = `${monthIndex + 1}`.padStart(2, '0');
  return `${year}-${formatMonth}`;
}

export function getMonthIndex(month: string): number {
  return parseInt(month.slice(5, 7)) - 1;
}

export function getYear(month: string): string {
  return month.slice(0, 4);
}

export function getMonth(day: string): string {
  return day.slice(0, 7);
}

export function getDay(day: string): number {
  return Number(d.format(_parse(day), 'dd'));
}

export function getMonthEnd(day: string): string {
  return subDays(nextMonth(day.slice(0, 7)) + '-01', 1);
}

export function getWeekEnd(
  date: DateLike,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): string {
  const converted = parseInt(firstDayOfWeekIdx || '0') as Day;
  return d.format(
    _parse(d.endOfWeek(_parse(date), { weekStartsOn: converted })),
    'yyyy-MM-dd',
  );
}

export function getYearStart(month: string): string {
  return getYear(month) + '-01';
}

export function getYearEnd(month: string): string {
  return getYear(month) + '-12';
}

export function sheetForMonth(month: string): string {
  return 'budget' + month.replace('-', '');
}

export function nameForMonth(month: DateLike, locale?: Locale): string {
  return d.format(_parse(month), 'MMMM ‘yy', { locale });
}

export function format(
  month: DateLike,
  format: string,
  locale?: Locale,
): string {
  return d.format(_parse(month), format, { locale });
}

export function formatDistance(
  date1: DateLike,
  date2: DateLike,
  locale?: Locale,
  options?: { addSuffix?: boolean; includeSeconds?: boolean },
): string {
  return d.formatDistance(_parse(date1), _parse(date2), {
    locale,
    ...options,
  });
}

export const getDateFormatRegex = memoizeOne((format: string) => {
  return new RegExp(
    format
      .replace(/d+/g, '\\d{1,2}')
      .replace(/M+/g, '\\d{1,2}')
      .replace(/y+/g, '\\d{4}'),
  );
});

export const getDayMonthFormat = memoizeOne((format: string) => {
  return format
    .replace(/y+/g, '')
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '');
});

export const getDayMonthRegex = memoizeOne((format: string) => {
  const regex = format
    .replace(/y+/g, '')
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '')
    .replace(/d+/g, '\\d{1,2}')
    .replace(/M+/g, '\\d{1,2}');
  return new RegExp('^' + regex + '$');
});

export const getMonthYearFormat = memoizeOne((format: string) => {
  return format
    .replace(/d+/g, '')
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '')
    .replace(/\/\//, '/')
    .replace(/\.\./, '.')
    .replace(/--/, '-');
});

export const getMonthYearRegex = memoizeOne((format: string) => {
  const regex = format
    .replace(/d+/g, '')
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '')
    .replace(/\/\//, '/')
    .replace(/M+/g, '\\d{1,2}')
    .replace(/y+/g, '\\d{2,4}');
  return new RegExp('^' + regex + '$');
});

export const getShortYearFormat = memoizeOne((format: string) => {
  return format.replace(/y+/g, 'yy');
});

export const getShortYearRegex = memoizeOne((format: string) => {
  const regex = format
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '')
    .replace(/d+/g, '\\d{1,2}')
    .replace(/M+/g, '\\d{1,2}')
    .replace(/y+/g, '\\d{2}');
  return new RegExp('^' + regex + '$');
});

export function isPayPeriod(monthId: string): boolean {
  return _isPayPeriod(monthId);
}

function getCalendarMonthStartDate(monthId: string): Date {
  return d.startOfMonth(_parse(monthId));
}

function getCalendarMonthEndDate(monthId: string): Date {
  return d.endOfMonth(_parse(monthId));
}

function getCalendarMonthLabel(monthId: string): string {
  return d.format(_parse(monthId), 'MMMM yyyy');
}

// pay period helpers are implemented in './pay-periods'

export function getMonthStartDate(
  monthId: string,
  config?: PayPeriodConfig,
): Date {
  if (isPayPeriod(monthId)) {
    // The presence of pay period ID IS proof that pay periods are enabled
    const activeConfig = config || getPayPeriodConfig();
    if (!activeConfig) {
      throw new Error(
        `Pay period config not available for '${monthId}'. This should not happen during normal operation.`,
      );
    }
    return getPayPeriodStartDate(monthId, activeConfig);
  }
  return getCalendarMonthStartDate(monthId);
}

export function getMonthEndDate(
  monthId: string,
  config?: PayPeriodConfig,
): Date {
  if (isPayPeriod(monthId)) {
    // The presence of pay period ID IS proof that pay periods are enabled
    const activeConfig = config || getPayPeriodConfig();
    if (!activeConfig) {
      throw new Error(
        `Pay period config not available for '${monthId}'. This should not happen during normal operation.`,
      );
    }
    return getPayPeriodEndDate(monthId, activeConfig);
  }
  return getCalendarMonthEndDate(monthId);
}

export function getMonthLabel(
  monthId: string,
  config?: PayPeriodConfig,
): string {
  if (isPayPeriod(monthId)) {
    // The presence of pay period ID IS proof that pay periods are enabled
    const activeConfig = config || getPayPeriodConfig();
    if (activeConfig) {
      return getPayPeriodLabel(monthId, activeConfig);
    }
    // Fallback if config truly unavailable
    const mm = parseInt(monthId.slice(5, 7));
    return 'Period ' + String(mm - 12);
  }
  return getCalendarMonthLabel(monthId);
}

// New function to get display name for MonthPicker (Jan-1, Jan-2 format)
export function getMonthDisplayName(
  monthId: string,
  config?: PayPeriodConfig | null,
  locale?: Locale,
): string {
  if (isPayPeriod(monthId)) {
    // The presence of pay period ID IS proof that pay periods are enabled
    const activeConfig = config || getPayPeriodConfig();
    if (activeConfig) {
      const periodNumber = getPayPeriodNumberInMonth(monthId, activeConfig);
      const startDate = getMonthStartDate(monthId, activeConfig);
      const monthName = d.format(startDate, 'MMM', { locale });
      return `${monthName}-${periodNumber}`;
    }
    // Fallback if config truly unavailable
    const mm = parseInt(monthId.slice(5, 7));
    return 'P' + String(mm - 12);
  }

  return d.format(_parse(monthId), 'MMM', { locale });
}

// New function to get date range display for BudgetSummary
export function getMonthDateRange(
  monthId: string,
  config?: PayPeriodConfig | null,
  locale?: Locale,
): string {
  if (isPayPeriod(monthId)) {
    // The presence of pay period ID IS proof that pay periods are enabled
    const activeConfig = config || getPayPeriodConfig();
    if (activeConfig) {
      const startDate = getMonthStartDate(monthId, activeConfig);
      const endDate = getMonthEndDate(monthId, activeConfig);
      const startLabel = d.format(startDate, 'MMM d', { locale });
      const endLabel = d.format(endDate, 'MMM d', { locale });
      return `${startLabel} - ${endLabel}`;
    }
    // Fallback
    return getMonthLabel(monthId, activeConfig);
  }

  return d.format(_parse(monthId), 'MMMM yyyy', { locale });
}

export function resolveMonthRange(
  monthId: string,
  config?: PayPeriodConfig,
): { startDate: Date; endDate: Date; label: string } {
  if (isPayPeriod(monthId)) {
    // The presence of pay period ID IS proof that pay periods are enabled
    const activeConfig = config || getPayPeriodConfig();
    if (!activeConfig) {
      throw new Error(
        `Pay period config not available for '${monthId}'. This should not happen during normal operation.`,
      );
    }
    const startDate = getPayPeriodStartDate(monthId, activeConfig);
    const endDate = getPayPeriodEndDate(monthId, activeConfig);
    const label = getPayPeriodLabel(monthId, activeConfig);
    return { startDate, endDate, label };
  }

  return {
    startDate: getCalendarMonthStartDate(monthId),
    endDate: getCalendarMonthEndDate(monthId),
    label: getCalendarMonthLabel(monthId),
  };
}

export { getPayPeriodConfig, setPayPeriodConfig, generatePayPeriods };
