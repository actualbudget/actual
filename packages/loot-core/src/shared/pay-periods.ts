import * as d from 'date-fns';
import type { Locale } from 'date-fns';
import memoizeOne from 'memoize-one';

import type { PayPeriodConfig } from '#types/prefs';

export type { PayPeriodConfig };

export type PayPeriod = {
  monthId: string;
  startDate: string;
  endDate: string;
  label: string;
};

/**
 * Returns true if the given ID is a pay period ID (MM ≥ 13).
 * Pay periods use the YYYY-MM format with MM values 13–99.
 */
export function isPayPeriod(id: string): boolean {
  const mm = parseInt(id.slice(5, 7), 10);
  return mm >= 13;
}

function _generatePayPeriods(
  year: number,
  config: PayPeriodConfig,
): PayPeriod[] {
  const { payFrequency, startDate } = config;

  // Parse the reference start date
  const [refYear, refMonth, refDay] = startDate.split('-').map(Number);
  const refDate = new Date(refYear, refMonth - 1, refDay, 12);

  const periods: Array<{ startDate: Date; endDate: Date }> = [];

  if (payFrequency === 'biweekly') {
    // Project backward from refDate to find the first period whose start is
    // in January of the given year (or just before it, so that Jan belongs).
    // We'll find a period start that is <= Jan 1 of year and then walk forward.

    // Find the period that contains Jan 1 of the target year
    const jan1 = new Date(year, 0, 1, 12);

    // Calculate how many 14-day periods before/after refDate jan1 is
    const diffDays = d.differenceInDays(jan1, refDate);
    const periodsBefore = Math.floor(diffDays / 14);

    // Start of the period containing or just before jan1
    let cursor = d.addDays(refDate, periodsBefore * 14);
    // Walk back to ensure cursor <= jan1
    while (cursor > jan1) {
      cursor = d.subDays(cursor, 14);
    }
    // Walk forward if we're more than 14 days before jan1
    while (d.addDays(cursor, 14) <= jan1) {
      cursor = d.addDays(cursor, 14);
    }

    // cursor is now the start of the first period that contains Jan 1
    // or the last period that starts before Jan 1
    const firstPeriodStart = cursor;

    // Generate all periods whose start is within the year
    // First period starts at firstPeriodStart if it's in January,
    // otherwise it's the period containing Jan 1.
    // Actually: we want periods whose start date is in the given year.
    // But the first period may start before Jan 1 and overlap into the year.
    // Per the spec: "projects the cadence backward to find the earliest period
    // whose start date falls within January of the given year"
    // So we need the first period whose startDate >= Jan 1 of year.

    let periodStart = firstPeriodStart;
    // The current cursor may start before Jan 1; advance to the first one
    // that starts in Jan or later of the target year
    while (periodStart.getFullYear() < year) {
      periodStart = d.addDays(periodStart, 14);
    }

    // Now generate all periods that start within the given year
    while (periodStart.getFullYear() === year) {
      const periodEnd = d.subDays(d.addDays(periodStart, 14), 1);
      periods.push({ startDate: periodStart, endDate: periodEnd });
      periodStart = d.addDays(periodStart, 14);
    }
  } else if (payFrequency === 'weekly') {
    const jan1 = new Date(year, 0, 1, 12);
    const diffDays = d.differenceInDays(jan1, refDate);
    const weeksBefore = Math.floor(diffDays / 7);

    let cursor = d.addDays(refDate, weeksBefore * 7);
    while (cursor > jan1) {
      cursor = d.subDays(cursor, 7);
    }
    while (d.addDays(cursor, 7) <= jan1) {
      cursor = d.addDays(cursor, 7);
    }

    let periodStart = cursor;
    while (periodStart.getFullYear() < year) {
      periodStart = d.addDays(periodStart, 7);
    }

    while (periodStart.getFullYear() === year) {
      const periodEnd = d.subDays(d.addDays(periodStart, 7), 1);
      periods.push({ startDate: periodStart, endDate: periodEnd });
      periodStart = d.addDays(periodStart, 7);
    }
  } else if (payFrequency === 'monthly') {
    // Monthly periods: same day-of-month as startDate, each month
    // Period 1 starts on the startDate's day-of-month in January of year
    const dayOfMonth = refDay;

    for (let m = 0; m < 12; m++) {
      const periodStart = new Date(year, m, dayOfMonth, 12);
      // Handle months where the day doesn't exist (e.g., Feb 30 → Feb 28)
      if (periodStart.getMonth() !== m) {
        // Rolled over, use last day of month
        periodStart.setDate(0);
      }
      const nextPeriodStart = new Date(year, m + 1, dayOfMonth, 12);
      if (nextPeriodStart.getMonth() !== m + 1) {
        nextPeriodStart.setDate(0);
      }
      const periodEnd = d.subDays(nextPeriodStart, 1);
      periods.push({ startDate: periodStart, endDate: periodEnd });
    }
  }

  // Assertion: period count must not exceed 87
  if (periods.length > 87) {
    throw new Error(
      `generatePayPeriods: too many periods (${periods.length}) for year ${year} with frequency ${payFrequency}. Maximum is 87.`,
    );
  }

  // Map to PayPeriod objects with monthIds starting at YYYY-13
  return periods.map((p, i) => {
    const mm = String(13 + i).padStart(2, '0');
    const monthId = `${year}-${mm}`;
    const startStr = d.format(p.startDate, 'yyyy-MM-dd');
    const endStr = d.format(p.endDate, 'yyyy-MM-dd');
    return {
      monthId,
      startDate: startStr,
      endDate: endStr,
      label: monthId,
    };
  });
}

/**
 * Generates all pay periods for a given year based on the config.
 * Memoized on (year, payFrequency, startDate).
 */
export const generatePayPeriods = memoizeOne(
  _generatePayPeriods,
  (
    [year, config]: [number, PayPeriodConfig],
    [prevYear, prevConfig]: [number, PayPeriodConfig],
  ) =>
    year === prevYear &&
    config.payFrequency === prevConfig.payFrequency &&
    config.startDate === prevConfig.startDate,
);

/**
 * Returns the pay period ID containing the given date.
 * Handles the year-boundary case: when a January date falls in the prior
 * year's last period, the prior year's period takes precedence (per D7).
 */
export function getPayPeriodFromDate(
  date: Date,
  config: PayPeriodConfig,
): string {
  const year = date.getFullYear();
  const dateStr = d.format(date, 'yyyy-MM-dd');

  // Year-boundary case: if the date is in January, check the prior year's
  // last period first. Per D7, a January date belonging to a prior-year
  // period routes to that prior-year period.
  if (date.getMonth() === 0) {
    const priorPeriods = generatePayPeriods(year - 1, config);
    if (priorPeriods.length > 0) {
      const lastPrior = priorPeriods[priorPeriods.length - 1];
      if (dateStr >= lastPrior.startDate && dateStr <= lastPrior.endDate) {
        return lastPrior.monthId;
      }
    }
  }

  // Try the current year's periods
  const periods = generatePayPeriods(year, config);
  for (const period of periods) {
    if (dateStr >= period.startDate && dateStr <= period.endDate) {
      return period.monthId;
    }
  }

  // Fallback: return first period of the year
  return periods[0]?.monthId ?? `${year}-13`;
}

/**
 * Alias for getPayPeriodFromDate.
 */
export function getCurrentPayPeriod(
  date: Date,
  config: PayPeriodConfig,
): string {
  return getPayPeriodFromDate(date, config);
}

/**
 * Returns the next pay period ID after the given one.
 * Wraps from the last period of a year to the first of the next year.
 */
export function nextPayPeriod(
  monthId: string,
  config: PayPeriodConfig,
): string {
  const year = parseInt(monthId.slice(0, 4), 10);
  const mm = parseInt(monthId.slice(5, 7), 10);
  const periods = generatePayPeriods(year, config);
  const lastMm = 13 + periods.length - 1;

  if (mm < lastMm) {
    const nextMm = String(mm + 1).padStart(2, '0');
    return `${year}-${nextMm}`;
  } else {
    // Wrap to next year
    return `${year + 1}-13`;
  }
}

/**
 * Returns the previous pay period ID before the given one.
 * Wraps from the first period of a year to the last of the prior year.
 */
export function prevPayPeriod(
  monthId: string,
  config: PayPeriodConfig,
): string {
  const year = parseInt(monthId.slice(0, 4), 10);
  const mm = parseInt(monthId.slice(5, 7), 10);

  if (mm > 13) {
    const prevMm = String(mm - 1).padStart(2, '0');
    return `${year}-${prevMm}`;
  } else {
    // Wrap to prior year
    const priorPeriods = generatePayPeriods(year - 1, config);
    const lastMm = 13 + priorPeriods.length - 1;
    return `${year - 1}-${String(lastMm).padStart(2, '0')}`;
  }
}

/**
 * Adds (or subtracts, if n < 0) n pay periods to the given period ID.
 */
export function addPayPeriods(
  monthId: string,
  n: number,
  config: PayPeriodConfig,
): string {
  let current = monthId;
  if (n > 0) {
    for (let i = 0; i < n; i++) {
      current = nextPayPeriod(current, config);
    }
  } else if (n < 0) {
    for (let i = 0; i < -n; i++) {
      current = prevPayPeriod(current, config);
    }
  }
  return current;
}

/**
 * Returns an array of pay period IDs from start to end, inclusive.
 */
export function generatePayPeriodRange(
  start: string,
  end: string,
  config: PayPeriodConfig,
): string[] {
  const result: string[] = [];
  let current = start;

  // Safety guard against infinite loops
  let maxIterations = 1000;
  while (current <= end && maxIterations-- > 0) {
    result.push(current);
    if (current === end) break;
    current = nextPayPeriod(current, config);
  }

  return result;
}

/**
 * Returns a human-readable label for a pay period.
 *
 * 'picker' format: '{monthLetter}{withinMonthCount}' — e.g. 'J1', 'F2'
 *   The month letter is the first character of the locale-aware 'MMM'
 *   abbreviation of the period's start month. The count is the 1-based
 *   position of this period among all periods that start in the same
 *   calendar month.
 *
 * 'summary' format: '{startDate} - {endDate} (PP{globalN})' — e.g. 'Jan 5 - Jan 18 (PP1)'
 *
 * 'short' format: '{startDate} - {endDate}' — e.g. 'Jan 5 - Jan 18'
 *   A compact date range without the period number, suitable for mobile
 *   budget headings where space is constrained.
 */
export function getPayPeriodLabel(
  monthId: string,
  config: PayPeriodConfig,
  format: 'picker' | 'summary' | 'short' = 'summary',
  locale?: Locale,
): string {
  const year = parseInt(monthId.slice(0, 4), 10);
  const mm = parseInt(monthId.slice(5, 7), 10);
  const periodNumber = mm - 13 + 1;

  const periods = generatePayPeriods(year, config);
  const period = periods.find(p => p.monthId === monthId);

  if (!period) {
    return `PP${periodNumber}`;
  }

  const parseDate = (str: string) =>
    new Date(
      parseInt(str.slice(0, 4)),
      parseInt(str.slice(5, 7)) - 1,
      parseInt(str.slice(8, 10)),
      12,
    );

  const startDate = parseDate(period.startDate);
  const endDate = parseDate(period.endDate);

  if (format === 'picker') {
    // Derive month letter from locale-aware 'MMM' abbreviation
    const monthLetter = d.format(startDate, 'MMM', { locale })[0];

    // Count how many periods start in the same calendar month, find position
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const siblingsInMonth = periods.filter(p => {
      const ps = parseDate(p.startDate);
      return ps.getFullYear() === startYear && ps.getMonth() === startMonth;
    });
    const withinMonthCount =
      siblingsInMonth.findIndex(p => p.monthId === monthId) + 1;

    return `${monthLetter}${withinMonthCount}`;
  }

  const formatDate = (dt: Date) => d.format(dt, 'MMM d', { locale });

  if (format === 'short') {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  // 'summary' format
  return `${formatDate(startDate)} - ${formatDate(endDate)} (PP${periodNumber})`;
}

/**
 * Returns true when `month` represents the current period.
 *
 * Mode-agnostic: when `month` is a pay period ID and a valid config is
 * provided, compares against the current pay period. Otherwise compares
 * against the current calendar month (`YYYY-MM`). Lets callers highlight
 * the "current" column without knowing whether pay periods are active.
 */
export function isCurrentPeriod(
  month: string,
  config?: PayPeriodConfig,
): boolean {
  if (isPayPeriod(month) && config?.enabled) {
    return getPayPeriodFromDate(new Date(), config) === month;
  }
  return d.format(new Date(), 'yyyy-MM') === month;
}

type DateFilter =
  | { $gte: string; $lte: string }
  | { $transform: string; $eq: string };

/**
 * Converts a month or pay period ID into a query-compatible date filter.
 *
 * For active pay period IDs, returns a `{ $gte, $lte }` range covering the
 * period's start/end dates. For calendar months (or when config is absent),
 * returns a `{ $transform: '$month', $eq: month }` filter. The shape matches
 * existing filter objects used by loot-core queries.
 */
export function resolveMonthToDateFilter(
  month: string,
  config?: PayPeriodConfig,
): { date: DateFilter } {
  if (isPayPeriod(month) && config?.enabled) {
    const year = parseInt(month.slice(0, 4), 10);
    const periods = generatePayPeriods(year, config);
    const period = periods.find(p => p.monthId === month);
    if (period) {
      return {
        date: { $gte: period.startDate, $lte: period.endDate },
      };
    }
  }
  return { date: { $transform: '$month', $eq: month } };
}
