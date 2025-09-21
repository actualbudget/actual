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

  describe('bimonthly pay periods', () => {
    const bimonthlyConfig: PayPeriodConfig = {
      enabled: true,
      payFrequency: 'bimonthly',
      startDate: '2024-01-01',
    };

    test('generates 6 bimonthly periods per year', () => {
      const periods = generatePayPeriods(2024, bimonthlyConfig);
      expect(periods.length).toBe(6);
    });

    test('bimonthly periods span 2 months each', () => {
      const periods = generatePayPeriods(2024, bimonthlyConfig);
      
      // First period: Jan 1 - Feb 29 (2024 is leap year)
      expect(periods[0].startDate).toBe('2024-01-01');
      expect(periods[0].endDate).toBe('2024-02-29');
      
      // Second period: Mar 1 - Apr 30
      expect(periods[1].startDate).toBe('2024-03-01');
      expect(periods[1].endDate).toBe('2024-04-30');
      
      // Third period: May 1 - Jun 30
      expect(periods[2].startDate).toBe('2024-05-01');
      expect(periods[2].endDate).toBe('2024-06-30');
    });

    test('bimonthly period labels are correct', () => {
      const periods = generatePayPeriods(2024, bimonthlyConfig);
      
      expect(periods[0].label).toBe('Pay Period 1');
      expect(periods[1].label).toBe('Pay Period 2');
      expect(periods[2].label).toBe('Pay Period 3');
    });

    test('bimonthly periods work with different start dates', () => {
      const configMarch = { ...bimonthlyConfig, startDate: '2024-03-01' };
      const periods = generatePayPeriods(2024, configMarch);
      
      expect(periods.length).toBe(6);
      // First period should start from March
      expect(periods[0].startDate).toBe('2024-03-01');
      expect(periods[0].endDate).toBe('2024-04-30');
    });
  });
});

