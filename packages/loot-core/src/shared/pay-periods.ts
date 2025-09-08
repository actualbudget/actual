// @ts-strict-ignore
import * as d from 'date-fns';

import { parseDate, dayFromDate } from './date-utils';

export interface PayPeriodConfig {
  enabled: boolean;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  startDate: string; // ISO date string (yyyy-MM-dd)
  payDayOfWeek?: number; // 0-6 for weekly/biweekly
  payDayOfMonth?: number; // 1-31 for monthly
  yearStart: number; // plan year start (e.g. 2024)
}

// Pay period config will be loaded from database preferences
let __payPeriodConfig: PayPeriodConfig | null = null;

export function getPayPeriodConfig(): PayPeriodConfig | null {
  return __payPeriodConfig;
}

export function setPayPeriodConfig(config: PayPeriodConfig): void {
  __payPeriodConfig = config;
}

export function isPayPeriod(monthId: string): boolean {
  if (typeof monthId !== 'string' || monthId.length < 7 || monthId[4] !== '-') {
    return false;
  }
  const mm = parseInt(monthId.slice(5, 7));
  return Number.isFinite(mm) && mm >= 13 && mm <= 99;
}

function getNumericMonthValue(monthId: string): number {
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

function validatePayPeriodConfig(config: PayPeriodConfig | null | undefined): void {
  if (!config || config.enabled !== true) return;
  const validFreq = ['weekly', 'biweekly', 'semimonthly', 'monthly'];
  if (!validFreq.includes(config.payFrequency)) {
    throw new Error("Invalid payFrequency '" + String(config.payFrequency) + "'.");
  }
  const start = parseDate(config.startDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid startDate '" + String(config.startDate) + "'. Expected ISO date.");
  }
  if (!Number.isInteger(config.yearStart) || config.yearStart < 1) {
    throw new Error("Invalid yearStart '" + String(config.yearStart) + "'.");
  }
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

  const baseStart = parseDate(config.startDate);
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
    const planYearStartDate = parseDate(String(config.yearStart)); // yields Jan 1 of yearStart at 12:00
    const anchorMonthStart = d.startOfMonth(planYearStartDate);
    startDate = d.startOfMonth(d.addMonths(anchorMonthStart, periodIndex - 1));
    endDate = d.endOfMonth(startDate);
    label = 'Month ' + String(periodIndex);
  } else if (freq === 'semimonthly') {
    const planYearStartDate = parseDate(String(config.yearStart));
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

  const endOfYear = d.endOfYear(parseDate(String(year)));
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

// Pay period navigation functions
export function nextPayPeriod(monthId: string, config: PayPeriodConfig): string {
  const year = getNumericYearValue(monthId);
  const periodIndex = getPeriodIndex(monthId, config);
  
  // Check if we need to move to next year
  const nextPeriodIndex = periodIndex + 1;
  const maxPeriods = getMaxPeriodsForYear(config);
  
  if (nextPeriodIndex > maxPeriods) {
    // Move to first period of next year
    return String(year + 1) + '-13';
  }
  
  return String(year) + '-' + String(nextPeriodIndex + 12).padStart(2, '0');
}

export function prevPayPeriod(monthId: string, config: PayPeriodConfig): string {
  const year = getNumericYearValue(monthId);
  const periodIndex = getPeriodIndex(monthId, config);
  
  const prevPeriodIndex = periodIndex - 1;
  
  if (prevPeriodIndex < 1) {
    // Move to last period of previous year
    const prevYear = year - 1;
    const maxPeriods = getMaxPeriodsForYear({ ...config, yearStart: prevYear });
    return String(prevYear) + '-' + String(maxPeriods + 12).padStart(2, '0');
  }
  
  return String(year) + '-' + String(prevPeriodIndex + 12).padStart(2, '0');
}

export function addPayPeriods(monthId: string, n: number, config: PayPeriodConfig): string {
  let current = monthId;
  for (let i = 0; i < Math.abs(n); i++) {
    current = n > 0 ? nextPayPeriod(current, config) : prevPayPeriod(current, config);
  }
  return current;
}

// Pay period date conversion functions
export function getCurrentPayPeriod(date: Date, config: PayPeriodConfig): string {
  // Find which pay period this date falls into
  const year = date.getFullYear();
  const periods = generatePayPeriods(year, config);
  
  for (const period of periods) {
    const startDate = parseDate(period.startDate);
    const endDate = parseDate(period.endDate);
    
    if (d.isWithinInterval(date, { start: startDate, end: endDate })) {
      return period.monthId;
    }
  }
  
  // Fallback to current calendar month if not in any pay period
  return d.format(date, 'yyyy-MM');
}

export function getPayPeriodFromDate(date: Date, config: PayPeriodConfig): string {
  return getCurrentPayPeriod(date, config);
}

// Pay period range generation
export function generatePayPeriodRange(
  start: string,
  end: string,
  config: PayPeriodConfig,
  inclusive = false,
): string[] {
  const periods: string[] = [];
  let current = start;
  
  while (isPayPeriodBefore(current, end)) {
    periods.push(current);
    current = nextPayPeriod(current, config);
  }
  
  if (inclusive) {
    periods.push(current);
  }
  
  return periods;
}

// Helper functions
function getMaxPeriodsForYear(config: PayPeriodConfig): number {
  switch (config.payFrequency) {
    case 'weekly': return 52;
    case 'biweekly': return 26;
    case 'semimonthly': return 24;
    case 'monthly': return 12;
    default: return 12;
  }
}

function isPayPeriodBefore(month1: string, month2: string): boolean {
  return month1 < month2;
}

