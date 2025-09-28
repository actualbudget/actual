import { describe, test, expect, beforeEach } from 'vitest';

import * as monthUtils from './months';
import { loadPayPeriodConfigFromPrefs } from './pay-periods';

describe('Exact Error Reproduction', () => {
  beforeEach(() => {
    // Enable pay periods for testing - this reproduces the production scenario
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05',
    });
  });

  test('Should reproduce the exact error: 2025-31 to 2026-09', () => {
    // This is the exact scenario from the error message
    expect(() => {
      monthUtils.rangeInclusive('2025-31', '2026-09');
    }).toThrow('Mixed calendar month and pay period ranges are not allowed');

    expect(() => {
      monthUtils.rangeInclusive('2025-31', '2026-09');
    }).toThrow(
      "Range from '2025-31' (pay period) to '2026-09' (calendar month) is invalid",
    );
  });

  test('Should work if both values are converted to pay periods', () => {
    // If the conversion worked properly, both should be pay periods
    expect(() => {
      monthUtils.rangeInclusive('2025-31', '2026-38'); // 2026-09 converted to 2026-38
    }).not.toThrow();
  });

  test('Should identify month types correctly', () => {
    expect(monthUtils.isPayPeriod('2025-31')).toBe(true);
    expect(monthUtils.isPayPeriod('2026-09')).toBe(false);
    expect(monthUtils.isPayPeriod('2026-38')).toBe(true);
  });

  test('Debug the conversion logic', () => {
    // Test the actual conversion logic from the budget component
    const testBounds = { start: '2025-01', end: '2026-09' };

    const convertMonthToPayPeriod = (monthStr: string) => {
      // If already a pay period, keep it
      const mm = parseInt(monthStr.slice(5, 7));
      if (Number.isFinite(mm) && mm >= 13) return monthStr;

      // For calendar months, convert to pay period
      const year = parseInt(monthStr.slice(0, 4));
      const month = parseInt(monthStr.slice(5, 7));

      // Convert to the equivalent pay period range for the year
      // Use first and last pay periods as safe bounds
      if (month <= 6) {
        return `${year}-13`; // First pay period of year
      } else {
        // For end bounds, use the last pay period that would exist
        // For biweekly (26 periods): 26 + 12 = 38
        return `${year}-38`;
      }
    };

    const convertedStart = convertMonthToPayPeriod(testBounds.start);
    const convertedEnd = convertMonthToPayPeriod(testBounds.end);

    console.log('Conversion test:', {
      originalStart: testBounds.start,
      originalEnd: testBounds.end,
      convertedStart,
      convertedEnd,
      startIsPayPeriod: monthUtils.isPayPeriod(convertedStart),
      endIsPayPeriod: monthUtils.isPayPeriod(convertedEnd),
    });

    expect(convertedStart).toBe('2025-13');
    expect(convertedEnd).toBe('2026-38');
    expect(monthUtils.isPayPeriod(convertedStart)).toBe(true);
    expect(monthUtils.isPayPeriod(convertedEnd)).toBe(true);

    // This should work without errors
    expect(() => {
      monthUtils.rangeInclusive(convertedStart, convertedEnd);
    }).not.toThrow();
  });

  test('Debug addMonths behavior with pay periods', () => {
    // Test if addMonths might be creating invalid values
    const startPeriod = '2025-13';

    // Test various addition amounts to see if any create invalid values
    for (let i = 1; i <= 30; i++) {
      const result = monthUtils.addMonths(startPeriod, i);
      console.log(
        `addMonths(${startPeriod}, ${i}) = ${result}, isPayPeriod: ${monthUtils.isPayPeriod(result)}`,
      );

      expect(monthUtils.isPayPeriod(result)).toBe(true);
    }
  });
});
