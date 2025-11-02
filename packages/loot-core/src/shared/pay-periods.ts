// @ts-strict-ignore
import * as d from 'date-fns';
import memoizeOne from 'memoize-one';

import { parseDate, dayFromDate } from './date-utils';

export interface PayPeriodConfig {
  enabled: boolean;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  startDate: string; // ISO date string (yyyy-MM-dd)
  payDayOfWeek?: number; // 0-6 for weekly/biweekly
  payDayOfMonth?: number; // 1-31 for monthly
}

// Pay period config will be loaded from database preferences
let __payPeriodConfig: PayPeriodConfig | null = null;

export function getPayPeriodConfig(): PayPeriodConfig | null {
  return __payPeriodConfig;
}

export function setPayPeriodConfig(config: PayPeriodConfig): void {
  __payPeriodConfig = config;
}

export function loadPayPeriodConfigFromPrefs(prefs: {
  showPayPeriods?: string;
  payPeriodFrequency?: string;
  payPeriodStartDate?: string;
}): void {
  try {
    const config: PayPeriodConfig = {
      enabled: prefs.showPayPeriods === 'true',
      payFrequency:
        (prefs.payPeriodFrequency as PayPeriodConfig['payFrequency']) ||
        'monthly',
      startDate:
        prefs.payPeriodStartDate || new Date().toISOString().slice(0, 10),
    };

    setPayPeriodConfig(config);
  } catch (error) {
    // Set a disabled default config to ensure graceful fallback
    const fallbackConfig = {
      enabled: false,
      payFrequency: 'monthly' as const,
      startDate: new Date().toISOString().slice(0, 10),
    };
    setPayPeriodConfig(fallbackConfig);
  }
}

export function isPayPeriod(monthId: string): boolean {
  if (typeof monthId !== 'string' || monthId.length < 7 || monthId[4] !== '-') {
    return false;
  }
  const mm = parseInt(monthId.slice(5, 7));
  return Number.isFinite(mm) && mm >= 13 && mm <= 99;
}

function getNumericMonthValue(monthId: string): number {
  return parseInt(monthId.slice(5, 7));
}

function getNumericYearValue(monthId: string): number {
  return parseInt(monthId.slice(0, 4));
}

function getPeriodIndex(monthId: string): number {
  const mm = getNumericMonthValue(monthId);
  return mm - 12; // 13 -> 1
}

/**
 * Gets the maximum number of periods for the current year based on current config.
 * This is a self-contained function that doesn't require external config validation.
 */
function getMaxPeriodsForCurrentYear(): number {
  const config = getPayPeriodConfig();
  if (!config?.enabled) {
    // If config isn't available, assume the common biweekly (26 periods)
    // This is a safe fallback since the presence of pay period IDs means
    // pay periods are enabled, but config might not be loaded yet
    return 26;
  }
  return getMaxPeriodsForYear(config);
}

/**
 * Finds the first pay period of a target year based on a reference pattern.
 * Projects the pattern backward/forward to find the first period that starts in the target year.
 */
function findFirstPeriodOfYear(
  referenceStart: Date,
  dayInterval: number,
  targetYear: number,
): Date {
  // Calculate how many days from Jan 1 of target year to the reference start
  const targetYearStart = new Date(targetYear, 0, 1); // Jan 1 of target year
  const daysDiff = Math.floor(
    (referenceStart.getTime() - targetYearStart.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Find how many intervals to go back to get the first period that starts in target year
  const intervalOffset = Math.floor(daysDiff / dayInterval);

  // Calculate the first period start date
  let firstPeriodStart = d.addDays(
    referenceStart,
    -intervalOffset * dayInterval,
  );

  // Ensure we're actually in the target year (handle edge cases)
  while (firstPeriodStart.getFullYear() < targetYear) {
    firstPeriodStart = d.addDays(firstPeriodStart, dayInterval);
  }
  while (firstPeriodStart.getFullYear() > targetYear) {
    firstPeriodStart = d.addDays(firstPeriodStart, -dayInterval);
  }

  return firstPeriodStart;
}

function computePayPeriodByIndex(
  periodIndex: number,
  config: PayPeriodConfig,
  targetYear: number,
): { startDate: Date; endDate: Date; label: string } {
  const referenceStart = parseDate(config.startDate);
  const freq = config.payFrequency;

  let startDate: Date;
  let endDate: Date;
  let label = 'Pay Period ' + String(periodIndex);

  if (freq === 'weekly') {
    // Find the first weekly period that starts in the target year
    const firstPeriodStart = findFirstPeriodOfYear(
      referenceStart,
      7,
      targetYear,
    );
    startDate = d.addDays(firstPeriodStart, (periodIndex - 1) * 7);
    endDate = d.addDays(startDate, 6);
  } else if (freq === 'biweekly') {
    // Find the first biweekly period that starts in the target year
    const firstPeriodStart = findFirstPeriodOfYear(
      referenceStart,
      14,
      targetYear,
    );
    startDate = d.addDays(firstPeriodStart, (periodIndex - 1) * 14);
    endDate = d.addDays(startDate, 13);
  } else if (freq === 'monthly') {
    // Find the first monthly period that starts in the target year
    // For monthly periods, we use the day of month from reference date
    const referenceDay = referenceStart.getDate();
    startDate = new Date(targetYear, 0, referenceDay, 12); // Jan of target year at noon
    startDate = d.addMonths(startDate, periodIndex - 1);
    endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      referenceDay - 1,
      12,
    );
    label = 'Pay Period ' + String(periodIndex);
  } else {
    // semimonthly: Two periods per month: 1st-15th and 16th-end of month
    const monthOffset = Math.floor((periodIndex - 1) / 2);
    const isFirstHalf = (periodIndex - 1) % 2 === 0;
    const targetMonth = new Date(targetYear, monthOffset, 1);

    if (isFirstHalf) {
      startDate = d.startOfMonth(targetMonth);
      endDate = new Date(targetYear, monthOffset, 15);
    } else {
      startDate = new Date(targetYear, monthOffset, 16);
      endDate = d.endOfMonth(targetMonth);
    }
  }

  return { startDate, endDate, label };
}

export function getPayPeriodStartDate(
  monthId: string,
  config: PayPeriodConfig,
): Date {
  const index = getPeriodIndex(monthId);
  const year = getNumericYearValue(monthId);
  return computePayPeriodByIndex(index, config, year).startDate;
}

export function getPayPeriodEndDate(
  monthId: string,
  config: PayPeriodConfig,
): Date {
  const index = getPeriodIndex(monthId);
  const year = getNumericYearValue(monthId);
  return computePayPeriodByIndex(index, config, year).endDate;
}

export function getPayPeriodLabel(
  monthId: string,
  config: PayPeriodConfig,
): string {
  const index = getPeriodIndex(monthId);
  const year = getNumericYearValue(monthId);
  return computePayPeriodByIndex(index, config, year).label;
}

// Internal implementation without memoization
function _generatePayPeriodsImpl(
  year: number,
  config: PayPeriodConfig,
): Array<{
  monthId: string;
  startDate: string;
  endDate: string;
  label: string;
}> {
  if (!Number.isInteger(year) || year < 1) {
    throw new Error('Invalid year for generatePayPeriods');
  }
  // Trust that if generatePayPeriods is called, pay periods are enabled
  if (!config) return [];

  const results: Array<{
    monthId: string;
    startDate: string;
    endDate: string;
    label: string;
  }> = [];

  // Always generate a full year's worth of pay periods regardless of start date
  // This ensures pay periods are always available for budget range calculations
  const maxPeriods = getMaxPeriodsForYear(config);

  for (let idx = 1; idx <= maxPeriods; idx++) {
    const { startDate, endDate, label } = computePayPeriodByIndex(
      idx,
      config,
      year,
    );
    const monthId = String(year) + '-' + String(idx + 12).padStart(2, '0');

    results.push({
      monthId,
      startDate: dayFromDate(startDate),
      endDate: dayFromDate(endDate),
      label,
    });
  }

  return results;
}

/**
 * Generates all pay periods for a given year based on the configuration.
 *
 * This function is memoized for performance, with cache invalidation based on:
 * - Year
 * - Pay frequency (weekly, biweekly, semimonthly, monthly)
 * - Start date
 *
 * The cache automatically invalidates when any of these parameters change,
 * ensuring users always see correct pay periods after changing settings.
 *
 * @param year - The year to generate periods for (e.g., 2024)
 * @param config - The pay period configuration
 * @returns Array of pay periods with monthId, startDate, endDate, and label
 */
export const generatePayPeriods = memoizeOne(
  _generatePayPeriodsImpl,
  // Custom equality function: cache key based on parameters that affect output
  (newArgs, lastArgs) => {
    const [newYear, newConfig] = newArgs;
    const [lastYear, lastConfig] = lastArgs;

    // Year must match
    if (newYear !== lastYear) return false;

    // If either config is null/undefined, only match if both are
    if (!newConfig || !lastConfig) return newConfig === lastConfig;

    // Only these fields affect the generated periods
    return (
      newConfig.payFrequency === lastConfig.payFrequency &&
      newConfig.startDate === lastConfig.startDate
    );
  },
);

// Pay period navigation functions
export function nextPayPeriod(monthId: string): string {
  const year = getNumericYearValue(monthId);
  const periodIndex = getPeriodIndex(monthId);

  // Check if we need to move to next year
  const nextPeriodIndex = periodIndex + 1;
  const maxPeriods = getMaxPeriodsForCurrentYear();

  if (nextPeriodIndex > maxPeriods) {
    // Move to first period of next year
    return String(year + 1) + '-13';
  }

  return String(year) + '-' + String(nextPeriodIndex + 12).padStart(2, '0');
}

export function prevPayPeriod(monthId: string): string {
  const year = getNumericYearValue(monthId);
  const periodIndex = getPeriodIndex(monthId);

  const prevPeriodIndex = periodIndex - 1;

  if (prevPeriodIndex < 1) {
    // Move to last period of previous year
    const prevYear = year - 1;
    const maxPeriods = getMaxPeriodsForCurrentYear();
    return String(prevYear) + '-' + String(maxPeriods + 12).padStart(2, '0');
  }

  return String(year) + '-' + String(prevPeriodIndex + 12).padStart(2, '0');
}

export function addPayPeriods(monthId: string, n: number): string {
  let current = monthId;
  for (let i = 0; i < Math.abs(n); i++) {
    current = n > 0 ? nextPayPeriod(current) : prevPayPeriod(current);
  }
  return current;
}

/**
 * Calculate the numeric difference between two pay period indices.
 * Treats pay periods as discrete units (like months), not calendar dates.
 * Handles year boundaries correctly.
 *
 * Presence Rule: If either input is a pay period ID, pay periods are enabled.
 * Non-pay-period inputs (dates, calendar months) are automatically converted to pay period IDs.
 *
 * @param input1 - First input (pay period ID, date string, or calendar month)
 * @param input2 - Second input (pay period ID, date string, or calendar month)
 * @returns Number of pay periods from input2 to input1 (positive if input1 > input2)
 * @throws Error if pay period config not available
 *
 * @example
 * differenceInPayPeriods("2024-15", "2024-13") // Returns: 2 (15 is 2 periods after 13)
 * differenceInPayPeriods("2024-13", "2024-15") // Returns: -2 (13 is 2 periods before 15)
 * differenceInPayPeriods("2025-13", "2024-38") // Returns: 1 (for biweekly: first period of 2025 is 1 after last of 2024)
 * differenceInPayPeriods("2024-01-15", "2024-13") // Returns: 0 (both in same period)
 */
export function differenceInPayPeriods(input1: string, input2: string): number {
  // Presence Rule: If either is a pay period, config must exist
  const config = getPayPeriodConfig();
  if (!config) {
    throw new Error('Pay period config not available');
  }

  // Convert both inputs to pay period IDs if they aren't already
  const period1 = isPayPeriod(input1)
    ? input1
    : getPayPeriodFromDate(parseDate(input1), config);
  const period2 = isPayPeriod(input2)
    ? input2
    : getPayPeriodFromDate(parseDate(input2), config);

  const year1 = getNumericYearValue(period1);
  const year2 = getNumericYearValue(period2);
  const index1 = getPeriodIndex(period1);
  const index2 = getPeriodIndex(period2);

  if (year1 === year2) {
    // Same year: simple index subtraction
    return index1 - index2;
  }

  // Different years: account for year boundary
  const maxPeriods = getMaxPeriodsForCurrentYear();
  const yearDiff = year1 - year2;

  // Calculate total periods: (years * periods per year) + index difference
  return yearDiff * maxPeriods + (index1 - index2);
}

// Pay period date conversion functions
export function getCurrentPayPeriod(
  date: Date,
  config: PayPeriodConfig,
): string {
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

export function getPayPeriodFromDate(
  date: Date,
  config: PayPeriodConfig,
): string {
  return getCurrentPayPeriod(date, config);
}

// Pay period range generation
export function generatePayPeriodRange(
  start: string,
  end: string,
  inclusive = false,
): string[] {
  const periods: string[] = [];
  let current = start;

  while (isPayPeriodBefore(current, end)) {
    periods.push(current);
    current = nextPayPeriod(current);
  }

  if (inclusive) {
    periods.push(current);
  }

  return periods;
}

// Helper functions
function getMaxPeriodsForYear(config: PayPeriodConfig): number {
  switch (config.payFrequency) {
    case 'weekly':
      return 52;
    case 'biweekly':
      return 26;
    case 'semimonthly':
      return 24;
    case 'monthly':
      return 12;
    default:
      return 12;
  }
}

function isPayPeriodBefore(month1: string, month2: string): boolean {
  return month1 < month2;
}

// Helper function to get pay period number within a calendar month
export function getPayPeriodNumberInMonth(
  monthId: string,
  config: PayPeriodConfig,
): number {
  // Trust that if this function is called with a pay period ID, pay periods are enabled
  if (!isPayPeriod(monthId) || !config) return 0;

  const year = parseInt(monthId.slice(0, 4));
  const periodIndex = getPeriodIndex(monthId);
  const { startDate } = computePayPeriodByIndex(periodIndex, config, year);

  // Find which calendar month this pay period starts in
  const calendarMonth = d.format(startDate, 'yyyy-MM');
  const periods = generatePayPeriods(year, config);

  let count = 0;
  for (const period of periods) {
    const periodStartDate = parseDate(period.startDate);

    // Check if this pay period starts in the same calendar month
    const monthStart = d.startOfMonth(parseDate(calendarMonth + '-01'));
    const monthEnd = d.endOfMonth(monthStart);

    if (
      d.isWithinInterval(periodStartDate, { start: monthStart, end: monthEnd })
    ) {
      count++;

      // If this is our target period, return the count
      if (period.monthId === monthId) {
        return count;
      }
    }
  }

  return 0;
}
