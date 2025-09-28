import { describe, test, expect, beforeEach } from 'vitest';

import * as monthUtils from './months';
import { loadPayPeriodConfigFromPrefs } from './pay-periods';

describe('Pay Period Mixed Range Prevention', () => {
  beforeEach(() => {
    // Enable pay periods for testing
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05',
    });
  });

  describe('Mixed ranges should throw clear errors', () => {
    test('Calendar month to pay period throws error', () => {
      expect(() => monthUtils.range('2024-01', '2024-13')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );

      expect(() => monthUtils.range('2024-01', '2024-13')).toThrow(
        "Range from '2024-01' (calendar month) to '2024-13' (pay period) is invalid",
      );
    });

    test('Pay period to calendar month throws error', () => {
      expect(() => monthUtils.range('2024-13', '2024-03')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );

      expect(() => monthUtils.range('2024-13', '2024-03')).toThrow(
        "Range from '2024-13' (pay period) to '2024-03' (calendar month) is invalid",
      );
    });

    test('Error message includes helpful guidance', () => {
      expect(() => monthUtils.range('2024-01', '2024-13')).toThrow(
        "Use either all calendar months (e.g., '2024-01' to '2024-03') or all pay periods (e.g., '2024-13' to '2024-15')",
      );
    });
  });

  describe('Pure ranges should work correctly', () => {
    test('Pure pay period ranges work', () => {
      const payPeriodRange = monthUtils.range('2024-13', '2024-16');

      expect(payPeriodRange).toEqual(['2024-13', '2024-14', '2024-15']);
      expect(payPeriodRange.every(m => monthUtils.isPayPeriod(m))).toBe(true);
    });

    test('Single pay period works', () => {
      const singlePeriod = monthUtils.range('2024-13', '2024-14');
      expect(singlePeriod).toEqual(['2024-13']);
      expect(singlePeriod.every(m => monthUtils.isPayPeriod(m))).toBe(true);
    });

    // Note: Calendar month ranges when pay periods are enabled will go through
    // pay period logic (since monthFromDate() uses pay period config when enabled).
    // The key thing we're testing is that MIXED ranges are prevented.
  });

  describe('Edge cases and validation', () => {
    test('Same month types with different years work', () => {
      // Pay periods across years should work
      const crossYearPay = monthUtils.range('2023-35', '2024-15');
      expect(crossYearPay.every(m => monthUtils.isPayPeriod(m))).toBe(true);
      expect(crossYearPay.length).toBeGreaterThan(0);

      // Should contain periods from both years
      expect(crossYearPay.some(m => m.startsWith('2023-'))).toBe(true);
      expect(crossYearPay.some(m => m.startsWith('2024-'))).toBe(true);
    });

    test('Mixed range detection works for edge case month numbers', () => {
      // Calendar month 12 (December) to pay period 13 (first pay period)
      expect(() => monthUtils.range('2024-12', '2024-13')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );

      // Pay period 99 (max) to calendar month 01
      expect(() => monthUtils.range('2024-99', '2025-01')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );
    });

    test('Empty ranges handled correctly', () => {
      // Same calendar month (empty range)
      expect(monthUtils.range('2024-01', '2024-01')).toEqual([]);

      // Same pay period (empty range)
      expect(monthUtils.range('2024-13', '2024-13')).toEqual([]);
    });
  });

  describe('Integration with other month utilities', () => {
    test('bounds() still works for individual months', () => {
      // Calendar month bounds
      const calendarBounds = monthUtils.bounds('2024-01');
      expect(calendarBounds.start).toBe(20240101);
      expect(calendarBounds.end).toBe(20240131);

      // Pay period bounds
      const payPeriodBounds = monthUtils.bounds('2024-13');
      expect(payPeriodBounds.start).toBe(20240105);
      expect(payPeriodBounds.end).toBe(20240118);
    });

    test('addMonths() works correctly for both types', () => {
      // Calendar month navigation
      expect(monthUtils.addMonths('2024-01', 1)).toBe('2024-02');
      expect(monthUtils.addMonths('2024-12', 1)).toBe('2025-01');

      // Pay period navigation
      expect(monthUtils.addMonths('2024-13', 1)).toBe('2024-14');
      expect(monthUtils.addMonths('2024-38', 1)).toBe('2025-13'); // Next year's first pay period
    });

    test('Month type detection is consistent', () => {
      // Calendar months
      expect(monthUtils.isPayPeriod('2024-01')).toBe(false);
      expect(monthUtils.isPayPeriod('2024-12')).toBe(false);

      // Pay periods
      expect(monthUtils.isPayPeriod('2024-13')).toBe(true);
      expect(monthUtils.isPayPeriod('2024-99')).toBe(true);

      // Invalid formats
      expect(monthUtils.isPayPeriod('2024-00')).toBe(false);
      expect(monthUtils.isPayPeriod('2024-1')).toBe(false); // Not zero-padded
    });
  });
});
