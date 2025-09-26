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
    
    // 2023 config should generate pay periods for 2024 if they fall within 2024
    const periods2023 = generatePayPeriods(2024, config2023);
    expect(periods2023.length).toBeGreaterThan(0);
    expect(periods2023[0].monthId).toBe('2024-13');
    
    // 2025 config should not generate pay periods for 2024
    expect(generatePayPeriods(2024, config2025)).toEqual([]);
  });
});

