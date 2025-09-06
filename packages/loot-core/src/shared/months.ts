// @ts-strict-ignore
import * as d from 'date-fns';
import { Locale } from 'date-fns';
import memoizeOne from 'memoize-one';

import { type SyncedPrefs } from '../types/prefs';

import * as Platform from './platform';

type DateLike = string | Date;
type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function _parse(value: DateLike): Date {
  if (typeof value === 'string') {
    // Dates are hard. We just want to deal with months in the format
    // 2020-01 and days in the format 2020-01-01, but life is never
    // simple. We want to rely on native dates for date logic because
    // days are complicated (leap years, etc). But relying on native
    // dates mean we're exposed to craziness.
    //
    // The biggest problem is that JS dates work with local time by
    // default. We could try to only work with UTC, but there's not an
    // easy way to make `format` avoid local time, and not sure if we
    // want that anyway (`currentMonth` should surely print the local
    // time). We need to embrace local time, and as long as inputs to
    // date logic and outputs from format are local time, it should
    // work.
    //
    // To make sure we're in local time, always give Date integer
    // values. If you pass in a string to parse, different string
    // formats produce different results.
    //
    // A big problem is daylight savings, however. Usually, when
    // giving the time to the Date constructor, you get back a date
    // specifically for that time in your local timezone. However, if
    // daylight savings occurs on that exact time, you will get back
    // something different:
    //
    // This is fine:
    // > new Date(2017, 2, 12, 1).toString()
    // > 'Sun Mar 12 2017 01:00:00 GMT-0500 (Eastern Standard Time)'
    //
    // But wait, we got back a different time (3AM instead of 2AM):
    // > new Date(2017, 2, 12, 2).toString()
    // > 'Sun Mar 12 2017 03:00:00 GMT-0400 (Eastern Daylight Time)'
    //
    // The time is "correctly" adjusted via DST, but we _really_
    // wanted 2AM. The problem is that time simply doesn't exist.
    //
    // Why is this a problem? Well, consider a case where the DST
    // shift happens *at midnight* and it goes back an hour. You think
    // you have a date object for the next day, but when formatted it
    // actually shows the previous day. A more likely scenario: buggy
    // timezone data makes JS dates do this shift when it shouldn't,
    // so using midnight at the time for date logic gives back the
    // last day. See the time range of Sep 30 15:00 - Oct 1 1:00 for
    // the AEST timezone when nodejs-mobile incorrectly gives you back
    // a time an hour *before* you specified. Since this happens on
    // Oct 1, doing `addMonths(September, 1)` still gives you back
    // September. Issue here:
    // https://github.com/JaneaSystems/nodejs-mobile/issues/251
    //
    // The fix is simple once you understand this. Always use the 12th
    // hour of the day. That's it. There is no DST that shifts more
    // than 12 hours (god let's hope not) so no matter how far DST has
    // shifted backwards or forwards, doing date logic will stay
    // within the day we want.

    const [year, month, day] = value.split('-');
    if (day != null) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12);
    } else if (month != null) {
      return new Date(parseInt(year), parseInt(month) - 1, 1, 12);
    } else {
      return new Date(parseInt(year), 0, 1, 12);
    }
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  return value;
}

export const parseDate = _parse;

export function yearFromDate(date: DateLike): string {
  return d.format(_parse(date), 'yyyy');
}

export function monthFromDate(date: DateLike): string {
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
  } else {
    return d.format(new Date(), 'yyyy-MM');
  }
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
  return d.format(d.addMonths(_parse(month), 1), 'yyyy-MM');
}

export function prevYear(month: DateLike, format = 'yyyy-MM'): string {
  return d.format(d.subMonths(_parse(month), 12), format);
}

export function prevMonth(month: DateLike): string {
  return d.format(d.subMonths(_parse(month), 1), 'yyyy-MM');
}

export function addYears(year: DateLike, n: number): string {
  return d.format(d.addYears(_parse(year), n), 'yyyy');
}

export function addMonths(month: DateLike, n: number): string {
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
  return month === currentMonth();
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

// ----------------------------------------------
// Extended months: Pay Period Support (MM 13-99)
// ----------------------------------------------

export interface PayPeriodConfig {
  enabled: boolean;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  startDate: string; // ISO date string (yyyy-MM-dd)
  payDayOfWeek?: number; // 0-6 for weekly/biweekly
  payDayOfMonth?: number; // 1-31 for monthly
  yearStart: number; // plan year start (e.g. 2024)
}

let __payPeriodConfig: PayPeriodConfig | null = null;

export function getPayPeriodConfig(): PayPeriodConfig | null {
  return __payPeriodConfig;
}

export function setPayPeriodConfig(config: PayPeriodConfig): void {
  __payPeriodConfig = config;
}

function getNumericMonthValue(monthId: string): number {
  // Expect format 'YYYY-MM'
  if (typeof monthId !== 'string' || monthId.length < 7 || monthId[4] !== '-') {
    throw new Error("Invalid monthId '" + monthId + "'. Expected YYYY-MM string.");
  }
  const value = parseInt(monthId.slice(5, 7));
  if (!Number.isFinite(value) || value < 1 || value > 99) {
    throw new Error("Invalid MM in monthId '" + monthId + "'. MM must be 01-99.");
  }
  return value;
}

function getNumericYearValue(monthId: string): number {
  const value = parseInt(monthId.slice(0, 4));
  if (!Number.isFinite(value) || value < 1) {
    throw new Error("Invalid YYYY in monthId '" + monthId + "'.");
  }
  return value;
}

export function isCalendarMonth(monthId: string): boolean {
  const mm = getNumericMonthValue(monthId);
  return mm >= 1 && mm <= 12;
}

export function isPayPeriod(monthId: string): boolean {
  const mm = getNumericMonthValue(monthId);
  return mm >= 13 && mm <= 99;
}

function validatePayPeriodConfig(config: PayPeriodConfig | null | undefined): void {
  if (!config || config.enabled !== true) return;
  const validFreq = ['weekly', 'biweekly', 'semimonthly', 'monthly'];
  if (!validFreq.includes(config.payFrequency)) {
    throw new Error("Invalid payFrequency '" + String(config.payFrequency) + "'.");
  }
  const start = _parse(config.startDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid startDate '" + String(config.startDate) + "'. Expected ISO date.");
  }
  if (!Number.isInteger(config.yearStart) || config.yearStart < 1) {
    throw new Error("Invalid yearStart '" + String(config.yearStart) + "'.");
  }
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

function getPeriodIndex(monthId: string, config: PayPeriodConfig): number {
  const year = getNumericYearValue(monthId);
  if (year !== config.yearStart) {
    throw new Error(
      "monthId '" + monthId + "' year " + year + ' does not match plan yearStart ' + String(config.yearStart) + '.',
    );
  }
  const mm = getNumericMonthValue(monthId);
  if (mm < 13 || mm > 99) {
    throw new Error("monthId '" + monthId + "' is not a pay period bucket.");
  }
  return mm - 12; // 13 -> 1
}

function computePayPeriodByIndex(
  periodIndex: number,
  config: PayPeriodConfig,
): { startDate: Date; endDate: Date; label: string } {
  validatePayPeriodConfig(config);
  if (!config || !config.enabled) {
    throw new Error('Pay period config disabled or missing for pay period calculations.');
  }
  if (!Number.isInteger(periodIndex) || periodIndex < 1) {
    throw new Error("Invalid periodIndex '" + String(periodIndex) + "'.");
  }

  const baseStart = _parse(config.startDate);
  const freq = config.payFrequency;

  let startDate = baseStart;
  let endDate = baseStart;
  let label = '';

  if (freq === 'weekly') {
    startDate = d.addDays(baseStart, (periodIndex - 1) * 7);
    endDate = d.addDays(startDate, 6);
    label = 'Pay Period ' + String(periodIndex);
  } else if (freq === 'biweekly') {
    startDate = d.addDays(baseStart, (periodIndex - 1) * 14);
    endDate = d.addDays(startDate, 13);
    label = 'Pay Period ' + String(periodIndex);
  } else if (freq === 'monthly') {
    const planYearStartDate = _parse(String(config.yearStart)); // yields Jan 1 of yearStart at 12:00
    const anchorMonthStart = d.startOfMonth(planYearStartDate);
    startDate = d.startOfMonth(d.addMonths(anchorMonthStart, periodIndex - 1));
    endDate = d.endOfMonth(startDate);
    label = 'Month ' + String(periodIndex);
  } else if (freq === 'semimonthly') {
    const planYearStartDate = _parse(String(config.yearStart));
    const monthOffset = Math.floor((periodIndex - 1) / 2);
    const isFirstHalf = (periodIndex - 1) % 2 === 0;
    const monthStart = d.startOfMonth(d.addMonths(planYearStartDate, monthOffset));
    if (isFirstHalf) {
      startDate = monthStart;
      endDate = d.addDays(monthStart, 14);
    } else {
      const mid = d.addDays(monthStart, 15);
      const end = d.endOfMonth(monthStart);
      startDate = mid;
      endDate = end;
    }
    label = 'Pay Period ' + String(periodIndex);
  } else {
    throw new Error("Unsupported payFrequency '" + String(freq) + "'.");
  }

  return { startDate, endDate, label };
}

export function getPayPeriodStartDate(monthId: string, config: PayPeriodConfig): Date {
  const index = getPeriodIndex(monthId, config);
  return computePayPeriodByIndex(index, config).startDate;
}

export function getPayPeriodEndDate(monthId: string, config: PayPeriodConfig): Date {
  const index = getPeriodIndex(monthId, config);
  return computePayPeriodByIndex(index, config).endDate;
}

export function getPayPeriodLabel(monthId: string, config: PayPeriodConfig): string {
  const index = getPeriodIndex(monthId, config);
  return computePayPeriodByIndex(index, config).label;
}

export function getMonthStartDate(
  monthId: string,
  config?: PayPeriodConfig,
): Date {
  if (isCalendarMonth(monthId)) return getCalendarMonthStartDate(monthId);
  if (!config || !config.enabled) {
    throw new Error("Pay period requested for '" + monthId + "' but config is missing/disabled.");
  }
  return getPayPeriodStartDate(monthId, config);
}

export function getMonthEndDate(
  monthId: string,
  config?: PayPeriodConfig,
): Date {
  if (isCalendarMonth(monthId)) return getCalendarMonthEndDate(monthId);
  if (!config || !config.enabled) {
    throw new Error("Pay period requested for '" + monthId + "' but config is missing/disabled.");
  }
  return getPayPeriodEndDate(monthId, config);
}

export function getMonthLabel(
  monthId: string,
  config?: PayPeriodConfig,
): string {
  if (isCalendarMonth(monthId)) return getCalendarMonthLabel(monthId);
  if (!config || !config.enabled) {
    const mm = getNumericMonthValue(monthId);
    return 'Period ' + String(mm - 12);
  }
  return getPayPeriodLabel(monthId, config);
}

export function resolveMonthRange(
  monthId: string,
  config?: PayPeriodConfig,
): { startDate: Date; endDate: Date; label: string } {
  if (isCalendarMonth(monthId)) {
    return {
      startDate: getCalendarMonthStartDate(monthId),
      endDate: getCalendarMonthEndDate(monthId),
      label: getCalendarMonthLabel(monthId),
    };
  }
  if (!config) {
    throw new Error('Pay period config is required for pay period ranges.');
  }
  const index = getPeriodIndex(monthId, config);
  const { startDate, endDate, label } = computePayPeriodByIndex(index, config);
  return { startDate, endDate, label };
}

export function generatePayPeriods(
  year: number,
  config: PayPeriodConfig,
): Array<{ monthId: string; startDate: string; endDate: string; label: string }> {
  if (!Number.isInteger(year) || year < 1) {
    throw new Error('Invalid year for generatePayPeriods');
  }
  if (!config || !config.enabled) return [];
  if (config.yearStart !== year) {
    // Scope to single plan year as per initial implementation
    return [];
  }

  const endOfYear = d.endOfYear(_parse(String(year)));
  const results: Array<{ monthId: string; startDate: string; endDate: string; label: string }> = [];

  let idx = 1;
  while (true) {
    const { startDate, endDate, label } = computePayPeriodByIndex(idx, config);
    if (d.isAfter(startDate, endOfYear)) break;
    const monthId = String(year) + '-' + String(idx + 12).padStart(2, '0');
    results.push({ monthId, startDate: dayFromDate(startDate), endDate: dayFromDate(endDate), label });
    idx += 1;

    // Safety guard: do not exceed 87 periods (13..99)
    if (idx > 87) break;
  }

  return results;
}
