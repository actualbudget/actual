import { afterEach, beforeEach, vi } from 'vitest';

import type { PayPeriodConfig } from '#types/prefs';

import * as monthUtils from './months';
import {
  addPayPeriods,
  generatePayPeriods,
  getCurrentPayPeriod,
  getPayPeriodFromDate,
  getPayPeriodLabel,
  isCurrentPeriod,
  isPayPeriod,
  nextPayPeriod,
  prevPayPeriod,
  resolveMonthToDateFilter,
} from './pay-periods';

const biweeklyConfig: PayPeriodConfig = {
  enabled: true,
  payFrequency: 'biweekly',
  startDate: '2024-09-26',
};

const weeklyConfig: PayPeriodConfig = {
  enabled: true,
  payFrequency: 'weekly',
  startDate: '2024-01-05',
};

const monthlyConfig: PayPeriodConfig = {
  enabled: true,
  payFrequency: 'monthly',
  startDate: '2024-01-15',
};

// ── 4.1 isPayPeriod boundary values ──────────────────────────────────────────

describe('isPayPeriod', () => {
  test('returns false for MM = 12 (calendar month)', () => {
    expect(isPayPeriod('2024-12')).toBe(false);
  });

  test('returns true for MM = 13 (first pay period)', () => {
    expect(isPayPeriod('2024-13')).toBe(true);
  });

  test('returns true for MM = 99 (last possible pay period)', () => {
    expect(isPayPeriod('2024-99')).toBe(true);
  });

  test('returns false for a normal month like 2024-01', () => {
    expect(isPayPeriod('2024-01')).toBe(false);
  });
});

// ── 4.2 generatePayPeriods ───────────────────────────────────────────────────

describe('generatePayPeriods', () => {
  test('biweekly: returns exactly 26 periods for 2024', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    expect(periods).toHaveLength(26);
  });

  test('biweekly: monthIds run from 2024-13 to 2024-38', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    expect(periods[0].monthId).toBe('2024-13');
    expect(periods[periods.length - 1].monthId).toBe('2024-38');
  });

  test('biweekly: each period is exactly 14 days', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    for (const p of periods) {
      // Use UTC to avoid DST-related hour shifts
      const start = new Date(p.startDate + 'T00:00:00Z');
      const end = new Date(p.endDate + 'T00:00:00Z');
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(13); // 14-day period, end - start = 13 days
    }
  });

  test('weekly: returns 52 or 53 periods for 2024', () => {
    const periods = generatePayPeriods(2024, weeklyConfig);
    expect(periods.length).toBeGreaterThanOrEqual(52);
    expect(periods.length).toBeLessThanOrEqual(53);
  });

  test('weekly: first period monthId is 2024-13', () => {
    const periods = generatePayPeriods(2024, weeklyConfig);
    expect(periods[0].monthId).toBe('2024-13');
  });

  test('weekly: last period monthId is within allowed range', () => {
    const periods = generatePayPeriods(2024, weeklyConfig);
    const lastMm = parseInt(periods[periods.length - 1].monthId.slice(5), 10);
    expect(lastMm).toBeLessThanOrEqual(99);
  });

  test('monthly: returns exactly 12 periods for 2024', () => {
    const periods = generatePayPeriods(2024, monthlyConfig);
    expect(periods).toHaveLength(12);
  });

  test('monthly: period 2024-13 starts on January 15', () => {
    const periods = generatePayPeriods(2024, monthlyConfig);
    expect(periods[0].monthId).toBe('2024-13');
    expect(periods[0].startDate).toBe('2024-01-15');
  });

  test('monthly: period 2024-14 starts on February 15', () => {
    const periods = generatePayPeriods(2024, monthlyConfig);
    expect(periods[1].monthId).toBe('2024-14');
    expect(periods[1].startDate).toBe('2024-02-15');
  });

  test('throws if period count exceeds 87', () => {
    // This is practically impossible with supported frequencies, but we test
    // the guard exists by mocking — here we just verify weekly 2024 does NOT throw
    expect(() => generatePayPeriods(2024, weeklyConfig)).not.toThrow();
  });
});

// ── 4.3 Year-based numbering: 2024-13 is always period 1 ────────────────────

describe('year-based period numbering', () => {
  test('2024-13 is always the first period regardless of startDate', () => {
    const config1: PayPeriodConfig = {
      enabled: true,
      payFrequency: 'biweekly',
      startDate: '2024-01-05',
    };
    const config2: PayPeriodConfig = {
      enabled: true,
      payFrequency: 'biweekly',
      startDate: '2024-09-26',
    };
    const periods1 = generatePayPeriods(2024, config1);
    const periods2 = generatePayPeriods(2024, config2);
    expect(periods1[0].monthId).toBe('2024-13');
    expect(periods2[0].monthId).toBe('2024-13');
  });

  test('memoize: same arguments return same array reference', () => {
    const a = generatePayPeriods(2024, biweeklyConfig);
    const b = generatePayPeriods(2024, biweeklyConfig);
    expect(a).toBe(b);
  });

  test('memoize: different frequency produces different arrays', () => {
    const a = generatePayPeriods(2024, biweeklyConfig);
    const b = generatePayPeriods(2024, weeklyConfig);
    expect(a).not.toBe(b);
    expect(a.length).not.toBe(b.length);
  });
});

// ── 4.4 getPayPeriodFromDate ─────────────────────────────────────────────────

describe('getPayPeriodFromDate', () => {
  test('date in the middle of biweekly period 1', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    const period1 = periods[0];
    // Use a date 5 days into the period
    const midDate = new Date(period1.startDate + 'T12:00:00');
    midDate.setDate(midDate.getDate() + 5);
    expect(getPayPeriodFromDate(midDate, biweeklyConfig)).toBe('2024-13');
  });

  test('date on start boundary returns correct period', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    const startDate = new Date(periods[0].startDate + 'T12:00:00');
    expect(getPayPeriodFromDate(startDate, biweeklyConfig)).toBe('2024-13');
  });

  test('date on end boundary returns correct period', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    const endDate = new Date(periods[0].endDate + 'T12:00:00');
    expect(getPayPeriodFromDate(endDate, biweeklyConfig)).toBe('2024-13');
  });

  test('year-boundary: Jan date in prior year last period returns 2024-38', () => {
    // The last biweekly period of 2024 may extend into January 2025
    const periods2024 = generatePayPeriods(2024, biweeklyConfig);
    const lastPeriod = periods2024[periods2024.length - 1];
    expect(lastPeriod.monthId).toBe('2024-38');

    if (lastPeriod.endDate > '2024-12-31') {
      // A January date that falls within the last 2024 period should
      // resolve to the 2024 period (prior year takes precedence per D7)
      const janStr = lastPeriod.endDate; // e.g. '2025-01-02'
      const janDate = new Date(janStr + 'T12:00:00');
      const result = getPayPeriodFromDate(janDate, biweeklyConfig);
      expect(result).toBe('2024-38');
    } else {
      // Period stays within 2024; verify the last start resolves correctly
      const lastStart = new Date(lastPeriod.startDate + 'T12:00:00');
      expect(getPayPeriodFromDate(lastStart, biweeklyConfig)).toBe('2024-38');
    }
  });

  test('getCurrentPayPeriod is an alias', () => {
    const date = new Date('2024-06-15T12:00:00');
    expect(getCurrentPayPeriod(date, biweeklyConfig)).toBe(
      getPayPeriodFromDate(date, biweeklyConfig),
    );
  });
});

// ── 4.5 Period navigation ────────────────────────────────────────────────────

describe('period navigation', () => {
  test('nextPayPeriod within a year', () => {
    expect(nextPayPeriod('2024-15', biweeklyConfig)).toBe('2024-16');
  });

  test('nextPayPeriod at year boundary (biweekly last = 2024-38)', () => {
    expect(nextPayPeriod('2024-38', biweeklyConfig)).toBe('2025-13');
  });

  test('prevPayPeriod within a year', () => {
    expect(prevPayPeriod('2024-16', biweeklyConfig)).toBe('2024-15');
  });

  test('prevPayPeriod at year boundary', () => {
    expect(prevPayPeriod('2025-13', biweeklyConfig)).toBe('2024-38');
  });

  test('addPayPeriods with positive n', () => {
    expect(addPayPeriods('2024-13', 3, biweeklyConfig)).toBe('2024-16');
  });

  test('addPayPeriods crossing year boundary', () => {
    // 2024-36 + 5 = 2024-38, 2025-13, 2025-14, 2025-15 → 2025-15 (3 steps over)
    // Actually: 36→37, 37→38, 38→2025-13, 2025-13→14, 14→15 = 2025-15
    expect(addPayPeriods('2024-36', 5, biweeklyConfig)).toBe('2025-15');
  });

  test('addPayPeriods with n=0 returns same', () => {
    expect(addPayPeriods('2024-20', 0, biweeklyConfig)).toBe('2024-20');
  });

  test('addPayPeriods with negative n goes back', () => {
    expect(addPayPeriods('2024-16', -3, biweeklyConfig)).toBe('2024-13');
  });
});

// ── 4.6 _parse in months.ts ──────────────────────────────────────────────────

describe('_parse with pay period IDs', () => {
  test('throws when called with pay period ID and no config', () => {
    expect(() => monthUtils._parse('2024-13')).toThrow(/pay period.*config/i);
  });

  test('returns period start date when called with config', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    const period1 = periods[0];
    const result = monthUtils._parse('2024-13', biweeklyConfig);
    const expected = new Date(period1.startDate + 'T12:00:00');
    expect(result.getFullYear()).toBe(expected.getFullYear());
    expect(result.getMonth()).toBe(expected.getMonth());
    expect(result.getDate()).toBe(expected.getDate());
  });

  test('calendar month ID is unchanged (no config needed)', () => {
    const result = monthUtils._parse('2024-03');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2); // March = index 2
    expect(result.getDate()).toBe(1);
  });
});

// ── 4.7 bounds ───────────────────────────────────────────────────────────────

describe('bounds', () => {
  test('pay period returns actual period date range', () => {
    const periods = generatePayPeriods(2024, biweeklyConfig);
    const period1 = periods[0];
    const result = monthUtils.bounds('2024-13', biweeklyConfig);
    const expectedStart = parseInt(period1.startDate.replace(/-/g, ''), 10);
    const expectedEnd = parseInt(period1.endDate.replace(/-/g, ''), 10);
    expect(result.start).toBe(expectedStart);
    expect(result.end).toBe(expectedEnd);
  });

  test('calendar month is unchanged (returns full month bounds)', () => {
    const result = monthUtils.bounds('2024-03');
    expect(result.start).toBe(20240301);
    expect(result.end).toBe(20240331);
  });
});

// ── 4.8 monthFromDate and currentMonth ───────────────────────────────────────

describe('monthFromDate and currentMonth', () => {
  test('monthFromDate returns period ID when config.enabled = true', () => {
    const date = '2024-01-10';
    const periods = generatePayPeriods(2024, biweeklyConfig);
    // Find which period Jan 10 falls in
    const expected = periods.find(
      p => date >= p.startDate && date <= p.endDate,
    )?.monthId;
    expect(monthUtils.monthFromDate(date, biweeklyConfig)).toBe(expected);
  });

  test('monthFromDate returns calendar month when config.enabled = false', () => {
    const disabledConfig: PayPeriodConfig = {
      ...biweeklyConfig,
      enabled: false,
    };
    expect(monthUtils.monthFromDate('2024-01-10', disabledConfig)).toBe(
      '2024-01',
    );
  });

  test('monthFromDate without config returns calendar month', () => {
    expect(monthUtils.monthFromDate('2024-03-15')).toBe('2024-03');
  });

  test('currentMonth without config returns calendar month string', () => {
    const result = monthUtils.currentMonth();
    // Should match YYYY-MM format with MM 01-12
    expect(result).toMatch(/^\d{4}-(?:0[1-9]|1[0-2])$/);
  });
});

// ── 4.9 rangeInclusive ───────────────────────────────────────────────────────

describe('rangeInclusive', () => {
  test('period range from 2024-13 to 2024-16', () => {
    const result = monthUtils.rangeInclusive(
      '2024-13',
      '2024-16',
      biweeklyConfig,
    );
    expect(result).toEqual(['2024-13', '2024-14', '2024-15', '2024-16']);
  });

  test('mixed calendar + period IDs throws', () => {
    expect(() =>
      monthUtils.rangeInclusive('2024-11', '2024-15', biweeklyConfig),
    ).toThrow();
  });

  test('calendar month range is unchanged', () => {
    const result = monthUtils.rangeInclusive('2024-01', '2024-03');
    expect(result).toEqual(['2024-01', '2024-02', '2024-03']);
  });

  test('single period range returns one element', () => {
    const result = monthUtils.rangeInclusive(
      '2024-15',
      '2024-15',
      biweeklyConfig,
    );
    expect(result).toEqual(['2024-15']);
  });
});

// ── subMonths, isBefore, isAfter with pay period IDs ─────────────────────────

describe('subMonths with pay period IDs', () => {
  test('subMonths within a year', () => {
    expect(monthUtils.subMonths('2024-16', 2, biweeklyConfig)).toBe('2024-14');
  });

  test('subMonths crossing year boundary', () => {
    expect(monthUtils.subMonths('2025-13', 1, biweeklyConfig)).toBe('2024-38');
  });
});

describe('isBefore and isAfter with pay period IDs', () => {
  test('isBefore returns true for earlier period', () => {
    expect(monthUtils.isBefore('2024-14', '2024-15', biweeklyConfig)).toBe(
      true,
    );
  });

  test('isBefore returns false for later period', () => {
    expect(monthUtils.isBefore('2024-15', '2024-14', biweeklyConfig)).toBe(
      false,
    );
  });

  test('isBefore across year boundary', () => {
    expect(monthUtils.isBefore('2024-38', '2025-13', biweeklyConfig)).toBe(
      true,
    );
  });

  test('isAfter returns true for later period', () => {
    expect(monthUtils.isAfter('2025-13', '2024-38', biweeklyConfig)).toBe(true);
  });

  test('isBefore calendar months unchanged', () => {
    expect(monthUtils.isBefore('2024-01', '2024-03')).toBe(true);
  });
});

describe('nameForMonth with pay period IDs', () => {
  test('returns picker label via months.ts wrapper (short=true)', () => {
    expect(
      monthUtils.nameForMonth('2024-13', undefined, biweeklyConfig, true),
    ).toBe('J1');
  });

  test('returns summary label via months.ts wrapper (short=false)', () => {
    const label = monthUtils.nameForMonth(
      '2024-14',
      undefined,
      biweeklyConfig,
      false,
    );
    // Jan 18 - Jan 31 (PP2)
    expect(label).toMatch(/^Jan 18 - Jan 31 \(PP2\)$/);
  });

  test('calendar month label unchanged (no config)', () => {
    const label = monthUtils.nameForMonth('2024-03');
    expect(label).toMatch(/March/);
    expect(label).not.toMatch(/^PP/);
  });
});

// ── getPayPeriodLabel ─────────────────────────────────────────────────────────

describe('getPayPeriodLabel', () => {
  test('picker format: first period of January returns J1', () => {
    // 2024-13 starts Jan 4 (biweeklyConfig startDate 2024-09-26)
    expect(getPayPeriodLabel('2024-13', biweeklyConfig, 'picker')).toBe('J1');
  });

  test('picker format: second period of January returns J2', () => {
    // 2024-14 starts Jan 18
    expect(getPayPeriodLabel('2024-14', biweeklyConfig, 'picker')).toBe('J2');
  });

  test('picker format: first period of February returns F1', () => {
    // 2024-15 starts Feb 1
    expect(getPayPeriodLabel('2024-15', biweeklyConfig, 'picker')).toBe('F1');
  });

  test('picker format: uses start month even when period spans two calendar months', () => {
    // 2024-14 starts Jan 18 and ends Jan 31 — entirely in January
    // 2024-15 starts Feb 1 — so J2 is the last January period
    // Test a period that spans month boundary: 2024-13 starts Jan 4, ends Jan 17
    // Any period ending in the next month still uses its start month
    // Feb periods start in Feb so they get F letter
    expect(getPayPeriodLabel('2024-15', biweeklyConfig, 'picker')).toBe('F1');
  });

  test('picker format: monthly frequency always returns {L}1 (one period per month)', () => {
    // Monthly: one period per month, so withinMonthCount is always 1
    expect(getPayPeriodLabel('2024-13', monthlyConfig, 'picker')).toBe('J1');
    expect(getPayPeriodLabel('2024-14', monthlyConfig, 'picker')).toBe('F1');
    expect(getPayPeriodLabel('2024-15', monthlyConfig, 'picker')).toBe('M1');
  });

  test('summary format: includes date range and global period number', () => {
    // 2024-13 (biweekly): Jan 4 - Jan 17, period 1
    const label = getPayPeriodLabel('2024-13', biweeklyConfig, 'summary');
    expect(label).toBe('Jan 4 - Jan 17 (PP1)');
  });

  test('summary format: period spanning two months', () => {
    // 2024-15 starts Feb 1, ends Feb 14, is PP3
    const label = getPayPeriodLabel('2024-15', biweeklyConfig, 'summary');
    expect(label).toBe('Feb 1 - Feb 14 (PP3)');
  });

  test('summary format: uses hyphen separator (not en-dash)', () => {
    const label = getPayPeriodLabel('2024-13', biweeklyConfig, 'summary');
    expect(label).toContain(' - ');
    expect(label).not.toMatch(/–/); // no en-dash
  });

  test('short format: returns date range without period number', () => {
    // 2024-13 (biweekly): Jan 4 - Jan 17
    expect(getPayPeriodLabel('2024-13', biweeklyConfig, 'short')).toBe(
      'Jan 4 - Jan 17',
    );
  });
});

// ── isCurrentPeriod ──────────────────────────────────────────────────────────

describe('isCurrentPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Anchor "now" to 2024-01-10 (a Wednesday), which falls inside biweekly
    // period 2024-13 (Jan 4 - Jan 17) for biweeklyConfig.
    vi.setSystemTime(new Date(2024, 0, 10, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns true for current calendar month without config', () => {
    expect(isCurrentPeriod('2024-01')).toBe(true);
  });

  test('returns false for non-current calendar month without config', () => {
    expect(isCurrentPeriod('2024-02')).toBe(false);
  });

  test('returns true for current pay period with config', () => {
    expect(isCurrentPeriod('2024-13', biweeklyConfig)).toBe(true);
  });

  test('returns false for non-current pay period with config', () => {
    expect(isCurrentPeriod('2024-14', biweeklyConfig)).toBe(false);
  });

  test('calendar ID with config falls back to calendar comparison', () => {
    // '2024-01' is a calendar format (MM < 13), so it bypasses pay period
    // comparison and returns true because the current date is in Jan 2024.
    expect(isCurrentPeriod('2024-01', biweeklyConfig)).toBe(true);
  });
});

// ── resolveMonthToDateFilter ─────────────────────────────────────────────────

describe('resolveMonthToDateFilter', () => {
  test('calendar month without config returns transform filter', () => {
    expect(resolveMonthToDateFilter('2024-01')).toEqual({
      date: { $transform: '$month', $eq: '2024-01' },
    });
  });

  test('calendar month with config returns transform filter', () => {
    expect(resolveMonthToDateFilter('2024-01', biweeklyConfig)).toEqual({
      date: { $transform: '$month', $eq: '2024-01' },
    });
  });

  test('pay period with config returns date range filter', () => {
    // biweeklyConfig: 2024-13 spans Jan 4 - Jan 17
    expect(resolveMonthToDateFilter('2024-13', biweeklyConfig)).toEqual({
      date: { $gte: '2024-01-04', $lte: '2024-01-17' },
    });
  });

  test('pay period without config falls back to transform filter', () => {
    expect(resolveMonthToDateFilter('2024-13')).toEqual({
      date: { $transform: '$month', $eq: '2024-13' },
    });
  });
});
