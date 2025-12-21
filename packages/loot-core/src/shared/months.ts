// @ts-strict-ignore
import * as d from 'date-fns';
import { Locale } from 'date-fns';
import memoizeOne from 'memoize-one';

import { type SyncedPrefs } from '../types/prefs';

import { parseDate as sharedParseDate } from './date-utils';
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
  differenceInPayPeriods,
  getCurrentPayPeriod,
  getPayPeriodFromDate as _getPayPeriodFromDate,
  generatePayPeriodRange,
  getPayPeriodNumberInMonth,
} from './pay-periods';
import * as Platform from './platform';

type DateLike = string | Date;
type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Parse a date string or Date object into a Date.
 *
 * Supports multiple input formats:
 * - Full dates: "2025-10-15" → Oct 15, 2025
 * - Calendar months: "2025-10" → Oct 1, 2025
 * - Pay period IDs: "2025-32" → Start date of pay period 32 (auto-converted)
 * - Years: "2025" → Jan 1, 2025
 *
 * @param value - Date string or Date object
 * @returns Date object set to noon (12:00) to avoid DST issues
 */
export function _parse(value: DateLike): Date {
  // Auto-convert pay period IDs to their start date
  if (typeof value === 'string' && value.length === 7) {
    const monthNum = parseInt(value.split('-')[1]);
    if (monthNum > 12) {
      // Presence Rule: If pay period ID exists, convert it to start date
      return getMonthStartDate(value);
    }
  }

  // Use shared date parsing utility for all other cases
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
  // Convert pay period to its start date before performing week arithmetic
  const dateStr =
    typeof date === 'string' ? date : d.format(_parse(date), 'yyyy-MM-dd');

  if (isPayPeriod(dateStr)) {
    const config = getPayPeriodConfig();
    const startDate = getMonthStartDate(dateStr, config);
    return d.format(d.addWeeks(startDate, n), 'yyyy-MM-dd');
  }

  return d.format(d.addWeeks(_parse(date), n), 'yyyy-MM-dd');
}

export function differenceInCalendarMonths(
  month1: DateLike,
  month2: DateLike,
): number {
  const str1 =
    typeof month1 === 'string' ? month1 : d.format(_parse(month1), 'yyyy-MM');
  const str2 =
    typeof month2 === 'string' ? month2 : d.format(_parse(month2), 'yyyy-MM');

  if (isPayPeriod(str1) || isPayPeriod(str2)) {
    return differenceInPayPeriods(str1, str2);
  }

  return d.differenceInCalendarMonths(_parse(month1), _parse(month2));
}

export function differenceInCalendarDays(
  month1: DateLike,
  month2: DateLike,
): number {
  const str1 =
    typeof month1 === 'string'
      ? month1
      : d.format(_parse(month1), 'yyyy-MM-dd');
  const str2 =
    typeof month2 === 'string'
      ? month2
      : d.format(_parse(month2), 'yyyy-MM-dd');

  // If either is a pay period, convert to actual start dates
  if (isPayPeriod(str1) || isPayPeriod(str2)) {
    const config = getPayPeriodConfig();
    const date1 = isPayPeriod(str1)
      ? getMonthStartDate(str1, config)
      : _parse(month1);
    const date2 = isPayPeriod(str2)
      ? getMonthStartDate(str2, config)
      : _parse(month2);
    return d.differenceInCalendarDays(date1, date2);
  }

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
  // Convert pay period to its start date before performing week arithmetic
  const dateStr =
    typeof date === 'string' ? date : d.format(_parse(date), 'yyyy-MM-dd');

  if (isPayPeriod(dateStr)) {
    const config = getPayPeriodConfig();
    const startDate = getMonthStartDate(dateStr, config);
    return d.format(d.subWeeks(startDate, n), 'yyyy-MM-dd');
  }

  return d.format(d.subWeeks(_parse(date), n), 'yyyy-MM-dd');
}

export function subYears(year: string | Date, n: number) {
  return d.format(d.subYears(_parse(year), n), 'yyyy');
}

export function addDays(day: DateLike, n: number): string {
  // Convert pay period to its start date before performing day arithmetic
  const dateStr =
    typeof day === 'string' ? day : d.format(_parse(day), 'yyyy-MM-dd');

  if (isPayPeriod(dateStr)) {
    const config = getPayPeriodConfig();
    const startDate = getMonthStartDate(dateStr, config);
    return d.format(d.addDays(startDate, n), 'yyyy-MM-dd');
  }

  return d.format(d.addDays(_parse(day), n), 'yyyy-MM-dd');
}

export function subDays(day: DateLike, n: number): string {
  // Convert pay period to its start date before performing day arithmetic
  const dateStr =
    typeof day === 'string' ? day : d.format(_parse(day), 'yyyy-MM-dd');

  if (isPayPeriod(dateStr)) {
    const config = getPayPeriodConfig();
    const startDate = getMonthStartDate(dateStr, config);
    return d.format(d.subDays(startDate, n), 'yyyy-MM-dd');
  }

  return d.format(d.subDays(_parse(day), n), 'yyyy-MM-dd');
}

export function isBefore(month1: DateLike, month2: DateLike): boolean {
  const str1 =
    typeof month1 === 'string' ? month1 : d.format(_parse(month1), 'yyyy-MM');
  const str2 =
    typeof month2 === 'string' ? month2 : d.format(_parse(month2), 'yyyy-MM');

  const isPP1 = isPayPeriod(str1);
  const isPP2 = isPayPeriod(str2);

  // Both pay periods or both calendar months: use string comparison
  if (isPP1 || isPP2) {
    return str1 < str2;
  }

  // Calendar months: use date parsing
  return d.isBefore(_parse(month1), _parse(month2));
}

export function isAfter(month1: DateLike, month2: DateLike): boolean {
  const str1 =
    typeof month1 === 'string' ? month1 : d.format(_parse(month1), 'yyyy-MM');
  const str2 =
    typeof month2 === 'string' ? month2 : d.format(_parse(month2), 'yyyy-MM');

  const isPP1 = isPayPeriod(str1);
  const isPP2 = isPayPeriod(str2);

  // Both pay periods or both calendar months: use string comparison
  if (isPP1 || isPP2) {
    return str1 > str2;
  }

  // Calendar months: use date parsing
  return d.isAfter(_parse(month1), _parse(month2));
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
    const config = getPayPeriodConfig();
    const year = parseInt(monthStr.slice(0, 4));
    const periods = generatePayPeriods(year, config!);
    const period = periods.find(p => p.monthId === monthStr);

    if (period) {
      return {
        start: parseInt(period.startDate.replace(/-/g, '')),
        end: parseInt(period.endDate.replace(/-/g, '')),
      };
    }
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

  if (startIsPayPeriod || endIsPayPeriod) {
    return generatePayPeriodRange(startStr, endStr, inclusive);
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

export function getPayPeriodFromDate(
  date: Date,
  config: PayPeriodConfig,
): string {
  return _getPayPeriodFromDate(date, config);
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
    const activeConfig = config || getPayPeriodConfig();
    return getPayPeriodStartDate(monthId, activeConfig!);
  }
  return getCalendarMonthStartDate(monthId);
}

export function getMonthEndDate(
  monthId: string,
  config?: PayPeriodConfig,
): Date {
  if (isPayPeriod(monthId)) {
    const activeConfig = config || getPayPeriodConfig();
    return getPayPeriodEndDate(monthId, activeConfig!);
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
      return `${monthName.charAt(0)}${periodNumber}`;
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

  // For calendar months, return just the month name (e.g., "January")
  // This is used by desktop BudgetSummary. Mobile uses getMonthTextWithYear() for the 'yy format.
  return d.format(_parse(monthId), 'MMMM', { locale });
}

// Function to get month text with year for mobile UI components
export function getMonthTextWithYear(
  monthId: string,
  config?: PayPeriodConfig | null,
  locale?: Locale,
): string {
  if (isPayPeriod(monthId)) {
    // For pay periods, show the date range (e.g., "Jan 5 - Jan 18")
    return getMonthDateRange(monthId, config, locale);
  }

  // For calendar months, return month with abbreviated year (e.g., "January '17")
  return nameForMonth(monthId, locale);
}

export { getPayPeriodConfig, setPayPeriodConfig, generatePayPeriods };
