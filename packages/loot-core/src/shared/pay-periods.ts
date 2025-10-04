// @ts-strict-ignore
import * as d from 'date-fns';

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

// Cache for generated pay periods to avoid regenerating them repeatedly
const payPeriodCache = new Map<
  string,
  Array<{
    monthId: string;
    startDate: string;
    endDate: string;
    label: string;
  }>
>();

export function getPayPeriodConfig(): PayPeriodConfig | null {
  return __payPeriodConfig;
}

export function setPayPeriodConfig(config: PayPeriodConfig): void {
  __payPeriodConfig = config;

  // Clear the cache when config changes to ensure we regenerate periods with new settings
  payPeriodCache.clear();

  console.log('[PayPeriod] Config set:', {
    enabled: config.enabled,
    payFrequency: config.payFrequency,
    startDate: config.startDate,
    timestamp: new Date().toISOString(),
  });
}

export function loadPayPeriodConfigFromPrefs(prefs: {
  showPayPeriods?: string;
  payPeriodFrequency?: string;
  payPeriodStartDate?: string;
}): void {
  console.log('[PayPeriod] Loading config from preferences:', prefs);

  try {
    const config: PayPeriodConfig = {
      enabled: prefs.showPayPeriods === 'true',
      payFrequency:
        (prefs.payPeriodFrequency as PayPeriodConfig['payFrequency']) ||
        'monthly',
      startDate:
        prefs.payPeriodStartDate || new Date().toISOString().slice(0, 10),
    };

    console.log('[PayPeriod] Parsed config before validation:', config);

    // Validate frequency is one of the allowed values
    const validFrequencies: PayPeriodConfig['payFrequency'][] = [
      'weekly',
      'biweekly',
      'semimonthly',
      'monthly',
    ];
    if (!validFrequencies.includes(config.payFrequency)) {
      console.warn(
        `[PayPeriod] Invalid pay period frequency '${config.payFrequency}', defaulting to 'monthly'`,
      );
      config.payFrequency = 'monthly';
    }

    // Validate startDate is a valid ISO date string
    if (config.startDate && isNaN(Date.parse(config.startDate))) {
      console.warn(
        `[PayPeriod] Invalid pay period start date '${config.startDate}', defaulting to today`,
      );
      config.startDate = new Date().toISOString().slice(0, 10);
    }

    setPayPeriodConfig(config);
    console.log(
      '[PayPeriod] Successfully loaded config from preferences:',
      config,
    );
  } catch (error) {
    console.warn(
      '[PayPeriod] Failed to load pay period config from preferences:',
      error,
    );

    // Set a disabled default config to ensure graceful fallback
    const fallbackConfig = {
      enabled: false,
      payFrequency: 'monthly' as const,
      startDate: new Date().toISOString().slice(0, 10),
    };
    setPayPeriodConfig(fallbackConfig);
    console.log(
      '[PayPeriod] Set fallback config due to error:',
      fallbackConfig,
    );
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
  if (typeof monthId !== 'string' || monthId.length < 7 || monthId[4] !== '-') {
    throw new Error(
      "Invalid monthId '" + monthId + "'. Expected YYYY-MM string.",
    );
  }
  const value = parseInt(monthId.slice(5, 7));
  if (!Number.isFinite(value) || value < 1 || value > 99) {
    throw new Error(
      "Invalid MM in monthId '" + monthId + "'. MM must be 01-99.",
    );
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

function validatePayPeriodConfig(
  config: PayPeriodConfig | null | undefined,
): void {
  if (!config || config.enabled !== true) return;
  const validFreq = ['weekly', 'biweekly', 'semimonthly', 'monthly'];
  if (!validFreq.includes(config.payFrequency)) {
    throw new Error(
      "Invalid payFrequency '" + String(config.payFrequency) + "'.",
    );
  }
  const start = parseDate(config.startDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error(
      "Invalid startDate '" +
        String(config.startDate) +
        "'. Expected ISO date.",
    );
  }
}

function getPeriodIndex(monthId: string): number {
  const mm = getNumericMonthValue(monthId);
  if (mm < 13 || mm > 99) {
    throw new Error("monthId '" + monthId + "' is not a pay period bucket.");
  }
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
  validatePayPeriodConfig(config);
  // Trust that if we're computing pay period by index, pay periods are enabled
  // This function is only called as part of pay period workflows
  if (!Number.isInteger(periodIndex) || periodIndex < 1) {
    throw new Error("Invalid periodIndex '" + String(periodIndex) + "'.");
  }
  if (!Number.isInteger(targetYear) || targetYear < 1) {
    throw new Error("Invalid targetYear '" + String(targetYear) + "'.");
  }

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
    startDate = new Date(targetYear, 0, referenceDay); // Jan of target year
    startDate = d.addMonths(startDate, periodIndex - 1);
    endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      referenceDay - 1,
    );
    label = 'Pay Period ' + String(periodIndex);
  } else if (freq === 'semimonthly') {
    // Two periods per month: 1st-15th and 16th-end of month
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
  } else {
    throw new Error("Unsupported payFrequency '" + String(freq) + "'.");
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

export function generatePayPeriods(
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

  // Create a cache key based on year and config
  const cacheKey = `${year}-${config.payFrequency}-${config.startDate}`;

  // Check if we already have this year's periods cached
  if (payPeriodCache.has(cacheKey)) {
    console.log(`[PayPeriod] Using cached pay periods for year ${year}`);
    return payPeriodCache.get(cacheKey)!;
  }

  console.log(
    `[PayPeriod] Generating pay periods for year ${year} with config:`,
    {
      payFrequency: config.payFrequency,
      startDate: config.startDate,
    },
  );

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

  // Cache the results
  payPeriodCache.set(cacheKey, results);
  console.log(
    `[PayPeriod] Generated and cached ${results.length} pay periods for year ${year}`,
  );
  return results;
}

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

// Helper function to count pay periods per calendar month
export function getPayPeriodCountForMonth(
  calendarMonth: string,
  config: PayPeriodConfig,
): number {
  // Trust that if this function is called, pay periods are enabled
  if (!config) return 0;

  const year = parseInt(calendarMonth.slice(0, 4));
  const month = parseInt(calendarMonth.slice(5, 7));

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return 0;
  }

  const periods = generatePayPeriods(year, config);
  let count = 0;

  for (const period of periods) {
    const startDate = parseDate(period.startDate);

    // Check if this pay period starts in the calendar month
    // A pay period belongs to the month where it starts, not where it ends
    const monthStart = d.startOfMonth(parseDate(calendarMonth + '-01'));
    const monthEnd = d.endOfMonth(monthStart);

    if (d.isWithinInterval(startDate, { start: monthStart, end: monthEnd })) {
      count++;
    }
  }

  return count;
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
