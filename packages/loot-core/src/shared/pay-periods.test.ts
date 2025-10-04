import { describe, expect, test } from 'vitest';

import {
  type PayPeriodConfig,
  isPayPeriod,
  getPayPeriodStartDate,
  getPayPeriodEndDate,
  getPayPeriodLabel,
  generatePayPeriods,
} from './pay-periods';

describe('pay-periods utilities', () => {
  const baseConfig: PayPeriodConfig = {
    enabled: true,
    payFrequency: 'biweekly',
    startDate: '2024-01-05',
  };

  test('isPayPeriod detects extended month values', () => {
    expect(isPayPeriod('2024-12')).toBe(false);
    expect(isPayPeriod('2024-13')).toBe(true);
    expect(isPayPeriod('2024-99')).toBe(true);
  });

  test('getPayPeriodStartDate / EndDate for biweekly periods', () => {
    const monthId = '2024-13'; // period index 1
    const start = getPayPeriodStartDate(monthId, baseConfig);
    const end = getPayPeriodEndDate(monthId, baseConfig);
    expect(start.toISOString().slice(0, 10)).toBe('2024-01-05');
    expect(end.toISOString().slice(0, 10)).toBe('2024-01-18');
  });

  test('getPayPeriodLabel returns stable label', () => {
    const monthId = '2024-14'; // period index 2
    const label = getPayPeriodLabel(monthId, baseConfig);
    expect(label).toContain('Pay Period');
  });

  test('generatePayPeriods returns sequential extended months within plan year', () => {
    const periods = generatePayPeriods(2024, baseConfig);
    expect(periods.length).toBeGreaterThan(20);
    expect(periods[0].monthId).toBe('2024-13');
    const last = periods[periods.length - 1];
    expect(Number(last.monthId.slice(5, 7))).toBeGreaterThanOrEqual(13);
  });

  test('handles edge cases for month validation', () => {
    // Valid calendar months
    expect(isPayPeriod('2024-01')).toBe(false);
    expect(isPayPeriod('2024-12')).toBe(false);

    // Valid pay periods
    expect(isPayPeriod('2024-13')).toBe(true);
    expect(isPayPeriod('2024-99')).toBe(true);

    // Invalid formats
    expect(isPayPeriod('2024-1')).toBe(false);
    expect(isPayPeriod('2024-100')).toBe(false);
    expect(isPayPeriod('invalid')).toBe(false);
    expect(isPayPeriod('2024-00')).toBe(false);
  });

  test('handles year boundaries correctly', () => {
    const config2023 = { ...baseConfig, startDate: '2023-01-05' };
    const config2025 = { ...baseConfig, startDate: '2025-01-05' };

    // 2023 config should generate pay periods for 2024
    const periods2023 = generatePayPeriods(2024, config2023);
    expect(periods2023.length).toBe(26); // 26 biweekly periods
    expect(periods2023[0].monthId).toBe('2024-13');

    // 2025 config should also generate pay periods for 2024 (always generate full year)
    const periods2025 = generatePayPeriods(2024, config2025);
    expect(periods2025.length).toBe(26); // 26 biweekly periods
    expect(periods2025[0].monthId).toBe('2024-13');

    // The actual dates should be different based on start date
    expect(periods2023[0].startDate).not.toBe(periods2025[0].startDate);
  });

  test('start date projection scenarios maintain year-based numbering', () => {
    // Test the critical scenario: start date from different months/years
    // should all generate 2024-13 as first period of 2024

    // Weekly scenario: Start date in September, but 2024-13 should be first period in 2024
    const weeklyConfig = {
      enabled: true,
      payFrequency: 'weekly' as const,
      startDate: '2024-09-26',
    };
    const weeklyPeriods = generatePayPeriods(2024, weeklyConfig);
    expect(weeklyPeriods[0].monthId).toBe('2024-13'); // First period of 2024
    expect(weeklyPeriods.length).toBe(52); // 52 weekly periods

    // Monthly scenario: Start date on 18th, projecting to first monthly period of 2024
    const monthlyConfig = {
      enabled: true,
      payFrequency: 'monthly' as const,
      startDate: '2024-09-18',
    };
    const monthlyPeriods = generatePayPeriods(2024, monthlyConfig);
    expect(monthlyPeriods[0].monthId).toBe('2024-13'); // First period of 2024
    expect(monthlyPeriods.length).toBe(12); // 12 monthly periods

    // The monthly periods should start on the 18th of each month
    const firstMonthlyStart = new Date(monthlyPeriods[0].startDate);
    expect(firstMonthlyStart.getDate()).toBe(18); // Should start on 18th
    expect(firstMonthlyStart.getMonth()).toBe(0); // January (0-indexed)

    // Semimonthly scenario: 24 periods per year
    const semimonthlyConfig = {
      enabled: true,
      payFrequency: 'semimonthly' as const,
      startDate: '2024-01-01',
    };
    const semimonthlyPeriods = generatePayPeriods(2024, semimonthlyConfig);
    expect(semimonthlyPeriods[0].monthId).toBe('2024-13'); // First period of 2024
    expect(semimonthlyPeriods.length).toBe(24); // 24 semimonthly periods

    // Cross-year projection: start date in 2025 should still generate 2024 periods starting with 2024-13
    const crossYearConfig = {
      enabled: true,
      payFrequency: 'biweekly' as const,
      startDate: '2025-03-15',
    };
    const crossYearPeriods = generatePayPeriods(2024, crossYearConfig);
    expect(crossYearPeriods[0].monthId).toBe('2024-13'); // First period of 2024
    expect(crossYearPeriods.length).toBe(26); // 26 biweekly periods
  });
});
