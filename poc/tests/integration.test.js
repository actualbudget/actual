import { describe, it, expect } from 'vitest';
import { resolveMonthRange, getMonthStartDate, getMonthEndDate } from '../payPeriodDates.js';
import { generatePayPeriods } from '../payPeriodGenerator.js';
import { createMockConfig } from '../payPeriodConfig.js';

const config = createMockConfig({ payFrequency: 'biweekly', startDate: '2024-01-05', yearStart: 2024 });

describe('Integration: transaction filtering style checks', () => {
  it('range correctness across month boundary', () => {
    const p2 = resolveMonthRange('202414', config);
    expect(p2.startDate.toISOString().slice(0, 10)).toBe('2024-01-19');
    expect(p2.endDate.toISOString().slice(0, 10)).toBe('2024-02-01');
  });

  it('year boundary handling', () => {
    const weekly = createMockConfig({ payFrequency: 'weekly', startDate: '2024-12-27' });
    const p1 = resolveMonthRange('202413', weekly);
    expect(p1.startDate.toISOString().slice(0, 10)).toBe('2024-12-27');
    expect(p1.endDate.toISOString().slice(0, 10)).toBe('2025-01-02');
  });
});

describe('Performance sanity', () => {
  it('handles 50+ periods fast', () => {
    const weekly = createMockConfig({ payFrequency: 'weekly' });
    const t0 = Date.now();
    const periods = generatePayPeriods(2024, weekly);
    const t1 = Date.now();
    expect(periods.length).toBeGreaterThan(50);
    expect(t1 - t0).toBeLessThan(200);
  });
});

describe('Error handling', () => {
  it('throws for pay period when config missing/disabled', () => {
    expect(() => getMonthStartDate('202413')).toThrow();
    expect(() => getMonthEndDate('202413', { ...config, enabled: false })).toThrow();
  });
});
