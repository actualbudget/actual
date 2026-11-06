import { describe, expect, it } from 'vitest';

import type { ForecastAssumptions } from '#types/models/forecast';

import {
  forecastPurchasingPower,
  growForecastIncome,
  validateForecastAssumptions,
} from './forecast-assumptions';

const assumptions: ForecastAssumptions = {
  anchorDate: '2024-03-10',
  inflationRate: 0.1,
  salaryGrowthRate: 0.1,
  incomeScheduleIds: ['salary'],
};

describe('forecast assumptions', () => {
  it('raises salary on anniversaries, compounded from the original amount', () => {
    expect(growForecastIncome(10000, '2025-03-09', assumptions)).toBe(10000);
    expect(growForecastIncome(10000, '2025-03-10', assumptions)).toBe(11000);
    expect(growForecastIncome(10000, '2026-03-10', assumptions)).toBe(12100);
  });

  it('discounts nominal balances rather than increasing expenses', () => {
    expect(forecastPurchasingPower(12100, '2026-03-10', assumptions)).toBe(
      10000,
    );
    expect(forecastPurchasingPower(-12100, '2026-03-10', assumptions)).toBe(
      -10000,
    );
    expect(forecastPurchasingPower(0, '2026-03-10', assumptions)).toBe(0);
    expect(
      forecastPurchasingPower(10000, '2024-09-09', assumptions),
    ).toBeLessThan(10000);
    expect(
      forecastPurchasingPower(10000, '2024-09-09', assumptions),
    ).toBeGreaterThan(9091);
  });

  it('leaves dates at or before the anchor unchanged', () => {
    for (const date of ['2023-01-01', assumptions.anchorDate]) {
      expect(growForecastIncome(10000, date, assumptions)).toBe(10000);
      expect(forecastPurchasingPower(10000, date, assumptions)).toBe(10000);
    }
  });

  it('uses February 28 for a leap-day anniversary in a non-leap year', () => {
    const leap = { ...assumptions, anchorDate: '2024-02-29' };
    expect(growForecastIncome(10000, '2025-02-27', leap)).toBe(10000);
    expect(growForecastIncome(10000, '2025-02-28', leap)).toBe(11000);
    expect(forecastPurchasingPower(11000, '2025-02-28', leap)).toBe(10000);
  });

  it('preserves balances with zero rates across a five-year horizon', () => {
    const zero = { ...assumptions, inflationRate: 0, salaryGrowthRate: 0 };
    expect(forecastPurchasingPower(12345, '2029-03-10', zero)).toBe(12345);
    expect(growForecastIncome(12345, '2029-03-10', zero)).toBe(12345);
  });

  it('rejects invalid dates and non-finite or unsupported rates', () => {
    for (const anchorDate of ['', '2024-02-30', '2024-03', 'invalid']) {
      expect(() =>
        validateForecastAssumptions({ ...assumptions, anchorDate }),
      ).toThrow();
    }
    for (const rate of [NaN, Infinity, -0.1, 1.01]) {
      expect(() =>
        validateForecastAssumptions({ ...assumptions, inflationRate: rate }),
      ).toThrow();
      expect(() =>
        validateForecastAssumptions({ ...assumptions, salaryGrowthRate: rate }),
      ).toThrow();
    }
  });

  it('rejects salary growth that exceeds safe integer amounts', () => {
    expect(() =>
      growForecastIncome(Number.MAX_SAFE_INTEGER, '2025-03-10', assumptions),
    ).toThrow('Salary growth exceeds the supported amount range');
  });
});
