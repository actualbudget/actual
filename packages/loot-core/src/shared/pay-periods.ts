// @ts-strict-ignore
import * as d from 'date-fns';

import { parseDate, dayFromDate } from './date-utils';

export interface PayPeriodConfig {
  enabled: boolean;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'bimonthly' | 'monthly';
  startDate: string; // ISO date string (yyyy-MM-dd)
  payDayOfWeek?: number; // 0-6 for weekly/biweekly
  payDayOfMonth?: number; // 1-31 for monthly
}

// Pay period config will be loaded from database preferences
let __payPeriodConfig: PayPeriodConfig | null = null;

// Cache for generated pay periods to avoid regenerating them repeatedly
const payPeriodCache = new Map<string, Array<{
  monthId: string;
  startDate: string;
  endDate: string;
  label: string;
}>>();

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
    timestamp: new Date().toISOString()
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
      'bimonthly',
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
    console.log('[PayPeriod] Successfully loaded config from preferences:', config);
  } catch (error) {
    console.warn('[PayPeriod] Failed to load pay period config from preferences:', error);

    // Set a disabled default config to ensure graceful fallback
    const fallbackConfig = {
      enabled: false,
      payFrequency: 'monthly' as const,
      startDate: new Date().toISOString().slice(0, 10),
    };
    setPayPeriodConfig(fallbackConfig);
    console.log('[PayPeriod] Set fallback config due to error:', fallbackConfig);
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
  const validFreq = ['weekly', 'biweekly', 'semimonthly', 'bimonthly', 'monthly'];
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

function getPeriodIndex(monthId: string, config: PayPeriodConfig): number {
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
    throw new Error(
      'Pay period config disabled or missing for pay period calculations.',
    );
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
    // Always generate 52 weeks starting from the configured start date
    startDate = d.addDays(baseStart, (periodIndex - 1) * 7);
    endDate = d.addDays(startDate, 6);
    label = 'Pay Period ' + String(periodIndex);
  } else if (freq === 'biweekly') {
    // Always generate 26 biweekly periods starting from the configured start date
    startDate = d.addDays(baseStart, (periodIndex - 1) * 14);
    endDate = d.addDays(startDate, 13);
    label = 'Pay Period ' + String(periodIndex);
  } else if (freq === 'monthly') {
    // Always generate 12 monthly periods starting from the configured start date
    const planYearStartDate = parseDate(config.startDate);
    const anchorMonthStart = d.startOfMonth(planYearStartDate);
    startDate = d.startOfMonth(d.addMonths(anchorMonthStart, periodIndex - 1));
    endDate = d.endOfMonth(startDate);
    label = 'Month ' + String(periodIndex);
  } else if (freq === 'semimonthly') {
    // Always generate 24 semimonthly periods starting from the configured start date
    const planYearStartDate = parseDate(config.startDate);
    const monthOffset = Math.floor((periodIndex - 1) / 2);
    const isFirstHalf = (periodIndex - 1) % 2 === 0;
    const monthStart = d.startOfMonth(
      d.addMonths(planYearStartDate, monthOffset),
    );
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
  } else if (freq === 'bimonthly') {
    // Always generate 6 bimonthly periods starting from the configured start date
    const planYearStartDate = parseDate(config.startDate);
    const monthOffset = (periodIndex - 1) * 2;
    const monthStart = d.startOfMonth(
      d.addMonths(planYearStartDate, monthOffset),
    );
    startDate = monthStart;
    endDate = d.endOfMonth(d.addMonths(monthStart, 1));
    label = 'Pay Period ' + String(periodIndex);
  } else {
    throw new Error("Unsupported payFrequency '" + String(freq) + "'.");
  }

  return { startDate, endDate, label };
}

export function getPayPeriodStartDate(
  monthId: string,
  config: PayPeriodConfig,
): Date {
  const index = getPeriodIndex(monthId, config);
  return computePayPeriodByIndex(index, config).startDate;
}

export function getPayPeriodEndDate(
  monthId: string,
  config: PayPeriodConfig,
): Date {
  const index = getPeriodIndex(monthId, config);
  return computePayPeriodByIndex(index, config).endDate;
}

export function getPayPeriodLabel(
  monthId: string,
  config: PayPeriodConfig,
): string {
  const index = getPeriodIndex(monthId, config);
  return computePayPeriodByIndex(index, config).label;
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
  if (!config || !config.enabled) return [];

  // Create a cache key based on year and config
  const cacheKey = `${year}-${config.payFrequency}-${config.startDate}`;
  
  // Check if we already have this year's periods cached
  if (payPeriodCache.has(cacheKey)) {
    console.log(`[PayPeriod] Using cached pay periods for year ${year}`);
    return payPeriodCache.get(cacheKey)!;
  }

  console.log(`[PayPeriod] Generating pay periods for year ${year} with config:`, {
    payFrequency: config.payFrequency,
    startDate: config.startDate
  });

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
    const { startDate, endDate, label } = computePayPeriodByIndex(idx, config);
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
  console.log(`[PayPeriod] Generated and cached ${results.length} pay periods for year ${year}`);
  return results;
}

// Pay period navigation functions
export function nextPayPeriod(
  monthId: string,
  config: PayPeriodConfig,
): string {
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

export function prevPayPeriod(
  monthId: string,
  config: PayPeriodConfig,
): string {
  const year = getNumericYearValue(monthId);
  const periodIndex = getPeriodIndex(monthId, config);

  const prevPeriodIndex = periodIndex - 1;

  if (prevPeriodIndex < 1) {
    // Move to last period of previous year
    const prevYear = year - 1;
    const maxPeriods = getMaxPeriodsForYear(config);
    return String(prevYear) + '-' + String(maxPeriods + 12).padStart(2, '0');
  }

  return String(year) + '-' + String(prevPeriodIndex + 12).padStart(2, '0');
}

export function addPayPeriods(
  monthId: string,
  n: number,
  config: PayPeriodConfig,
): string {
  let current = monthId;
  for (let i = 0; i < Math.abs(n); i++) {
    current =
      n > 0 ? nextPayPeriod(current, config) : prevPayPeriod(current, config);
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
    case 'weekly':
      return 52;
    case 'biweekly':
      return 26;
    case 'semimonthly':
      return 24;
    case 'bimonthly':
      return 6;
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
  if (!config?.enabled) return 0;

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
    const endDate = parseDate(period.endDate);

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
  if (!isPayPeriod(monthId) || !config?.enabled) return 0;

  const year = parseInt(monthId.slice(0, 4));
  const periodIndex = getPeriodIndex(monthId, config);
  const { startDate } = computePayPeriodByIndex(periodIndex, config);

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
