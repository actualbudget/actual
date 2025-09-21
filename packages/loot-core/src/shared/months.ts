// @ts-strict-ignore
import * as d from 'date-fns';
import { Locale } from 'date-fns';
import memoizeOne from 'memoize-one';

import { type SyncedPrefs } from '../types/prefs';

import * as Platform from './platform';
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
  const monthStr = typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');
  
  if (isPayPeriod(monthStr)) {
    const config = getPayPeriodConfig();
    if (config?.enabled) {
      return nextPayPeriod(monthStr, config);
    }
  }
  
  return d.format(d.addMonths(_parse(month), 1), 'yyyy-MM');
}

export function prevYear(month: DateLike, format = 'yyyy-MM'): string {
  return d.format(d.subMonths(_parse(month), 12), format);
}

export function prevMonth(month: DateLike): string {
  const monthStr = typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');
  
  if (isPayPeriod(monthStr)) {
    const config = getPayPeriodConfig();
    if (config?.enabled) {
      return prevPayPeriod(monthStr, config);
    }
  }
  
  return d.format(d.subMonths(_parse(month), 1), 'yyyy-MM');
}

export function addYears(year: DateLike, n: number): string {
  return d.format(d.addYears(_parse(year), n), 'yyyy');
}

export function addMonths(month: DateLike, n: number): string {
  const monthStr = typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');
  
  if (isPayPeriod(monthStr)) {
    const config = getPayPeriodConfig();
    if (config?.enabled) {
      return addPayPeriods(monthStr, n, config);
    }
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
  const monthStr = typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');
  
  if (isPayPeriod(monthStr)) {
    const config = getPayPeriodConfig();
    if (config?.enabled) {
      return addPayPeriods(monthStr, -n, config);
    }
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
  return d.isBefore(_parse(month1), _parse(month2));
}

export function isAfter(month1: DateLike, month2: DateLike): boolean {
  return d.isAfter(_parse(month1), _parse(month2));
}

export function isCurrentMonth(month: DateLike): boolean {
  const monthStr = typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');
  return monthStr === currentMonth();
}

export function isCurrentDay(day: DateLike): boolean {
  return day === currentDay();
}

// TODO: This doesn't really fit in this module anymore, should
// probably live elsewhere
export function bounds(month: DateLike): { start: number; end: number } {
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
  const startStr = typeof start === 'string' ? start : d.format(_parse(start), 'yyyy-MM');
  const endStr = typeof end === 'string' ? end : d.format(_parse(end), 'yyyy-MM');
  
  // Check if we're dealing with pay periods
  if (isPayPeriod(startStr) || isPayPeriod(endStr)) {
    const config = getPayPeriodConfig();
    if (config?.enabled) {
      return generatePayPeriodRange(startStr, endStr, config, inclusive);
    }
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
    if (!config || !config.enabled) {
      throw new Error("Pay period requested for '" + monthId + "' but config is missing/disabled.");
    }
    return getPayPeriodStartDate(monthId, config);
  }
  return getCalendarMonthStartDate(monthId);
}

export function getMonthEndDate(
  monthId: string,
  config?: PayPeriodConfig,
): Date {
  if (isPayPeriod(monthId)) {
    if (!config || !config.enabled) {
      throw new Error("Pay period requested for '" + monthId + "' but config is missing/disabled.");
    }
    return getPayPeriodEndDate(monthId, config);
  }
  return getCalendarMonthEndDate(monthId);
}

export function getMonthLabel(
  monthId: string,
  config?: PayPeriodConfig,
): string {
  if (isPayPeriod(monthId)) {
    if (!config || !config.enabled) {
      // Fallback for pay periods without config
      const mm = parseInt(monthId.slice(5, 7));
      return 'Period ' + String(mm - 12);
    }
    return getPayPeriodLabel(monthId, config);
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
    if (config?.enabled) {
      const periodNumber = getPayPeriodNumberInMonth(monthId, config);
      const startDate = getMonthStartDate(monthId, config);
      const monthName = d.format(startDate, 'MMM', { locale });
      return `${monthName}-${periodNumber}`;
    }
    // Fallback for pay periods without config
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
    if (config?.enabled) {
      const startDate = getMonthStartDate(monthId, config);
      const endDate = getMonthEndDate(monthId, config);
      const startLabel = d.format(startDate, 'MMM d', { locale });
      const endLabel = d.format(endDate, 'MMM d', { locale });
      return `${startLabel} - ${endLabel}`;
    }
    // Fallback
    return getMonthLabel(monthId, config);
  }
  
  return d.format(_parse(monthId), 'MMMM yyyy', { locale });
}

export function resolveMonthRange(
  monthId: string,
  config?: PayPeriodConfig,
): { startDate: Date; endDate: Date; label: string } {
  if (isPayPeriod(monthId)) {
    if (!config) {
      throw new Error('Pay period config is required for pay period ranges.');
    }
    const startDate = getPayPeriodStartDate(monthId, config);
    const endDate = getPayPeriodEndDate(monthId, config);
    const label = getPayPeriodLabel(monthId, config);
    return { startDate, endDate, label };
  }
  
  return {
    startDate: getCalendarMonthStartDate(monthId),
    endDate: getCalendarMonthEndDate(monthId),
    label: getCalendarMonthLabel(monthId),
  };
}

export { getPayPeriodConfig, setPayPeriodConfig, generatePayPeriods };
