import { describe, it, expect } from 'vitest';
import {
  isCalendarMonth,
  isPayPeriod,
  getMonthStartDate,
  getMonthEndDate,
  getMonthLabel,
  resolveMonthRange,
} from '../payPeriodDates.js';
import { createMockConfig } from '../payPeriodConfig.js';

const config = createMockConfig();

describe('Calendar months', () => {
  it('202401 -> January 1-31, 2024', () => {
    const start = getMonthStartDate('202401');
    const end = getMonthEndDate('202401');
    expect(start.toISOString().slice(0, 10)).toBe('2024-01-01');
    expect(end.toISOString().slice(0, 10)).toBe('2024-01-31');
    expect(getMonthLabel('202401')).toBe('January 2024');
    expect(isCalendarMonth('202401')).toBe(true);
    expect(isPayPeriod('202401')).toBe(false);
  });

  it('202412 -> December 1-31, 2024', () => {
    const start = getMonthStartDate('202412');
    const end = getMonthEndDate('202412');
    expect(start.toISOString().slice(0, 10)).toBe('2024-12-01');
    expect(end.toISOString().slice(0, 10)).toBe('2024-12-31');
  });

  it('202402 -> February 1-29, 2024 (leap year)', () => {
    const start = getMonthStartDate('202402');
    const end = getMonthEndDate('202402');
    expect(start.toISOString().slice(0, 10)).toBe('2024-02-01');
    expect(end.toISOString().slice(0, 10)).toBe('2024-02-29');
  });
});

describe('Pay periods (biweekly)', () => {
  it('202413 -> Jan 5-18, 2024 (period 1)', () => {
    const start = getMonthStartDate('202413', config);
    const end = getMonthEndDate('202413', config);
    expect(start.toISOString().slice(0, 10)).toBe('2024-01-05');
    expect(end.toISOString().slice(0, 10)).toBe('2024-01-18');
    expect(getMonthLabel('202413', config)).toBe('Pay Period 1');
  });
  it('202414 -> Jan 19-Feb 01, 2024 (period 2 spans months)', () => {
    const start = getMonthStartDate('202414', config);
    const end = getMonthEndDate('202414', config);
    expect(start.toISOString().slice(0, 10)).toBe('2024-01-19');
    expect(end.toISOString().slice(0, 10)).toBe('2024-02-01');
  });
  it('202415 -> Feb 02-15, 2024 (period 3)', () => {
    const start = getMonthStartDate('202415', config);
    const end = getMonthEndDate('202415', config);
    expect(start.toISOString().slice(0, 10)).toBe('2024-02-02');
    expect(end.toISOString().slice(0, 10)).toBe('2024-02-15');
  });
});

describe('Edge cases and errors', () => {
  it('invalid monthId MM=00', () => {
    expect(() => resolveMonthRange('202400', config)).toThrow();
  });
  it('invalid monthId MM>99', () => {
    expect(() => resolveMonthRange('2024100', config)).toThrow();
  });
  it('pay period without config errors', () => {
    expect(() => resolveMonthRange('202413')).toThrow();
  });
  it('graceful label fallback when config disabled', () => {
    expect(getMonthLabel('202413', { ...config, enabled: false })).toBe('Period 1');
  });
});
