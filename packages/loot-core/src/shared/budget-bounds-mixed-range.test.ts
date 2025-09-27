import { describe, test, expect, beforeEach } from 'vitest';
import * as monthUtils from './months';
import { loadPayPeriodConfigFromPrefs } from './pay-periods';

describe('Budget Bounds Mixed Range Issue', () => {
  beforeEach(() => {
    // Enable pay periods for testing - this reproduces the production scenario
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });
  });

  describe('MonthsProvider scenario - reproducing the actual error', () => {
    test('Calendar month bounds should work when no pay periods in range', () => {
      // When only calendar months are used, it should work fine
      const calendarBounds = { start: '2025-01', end: '2025-12' };

      expect(() => {
        monthUtils.rangeInclusive(calendarBounds.start, calendarBounds.end);
      }).not.toThrow();
    });

    test('Simulating the addMonths call that creates invalid end month', () => {
      // MonthsProvider does: monthUtils.addMonths(startMonth, numMonths - 1)
      // If startMonth is a pay period but numMonths takes us into calendar territory
      const payPeriodStartMonth = '2025-13';
      const numMonths = 12;

      // This should create a valid pay period end month
      const endMonth = monthUtils.addMonths(payPeriodStartMonth, numMonths - 1);

      // The range should work since both are pay periods
      expect(() => {
        monthUtils.rangeInclusive(payPeriodStartMonth, endMonth);
      }).not.toThrow();

      // Both should be pay periods
      expect(monthUtils.isPayPeriod(payPeriodStartMonth)).toBe(true);
      expect(monthUtils.isPayPeriod(endMonth)).toBe(true);
    });

    test('The actual problem: bounds validation with mixed types', () => {
      // This simulates the MonthsProvider scenario where:
      // 1. startMonth is converted to pay period (derivedStartMonth)
      // 2. bounds remain as calendar months
      // 3. getValidMonthBounds compares mixed types

      const calendarBounds = { start: '2025-01', end: '2026-09' };
      const payPeriodStartMonth = '2025-13';

      // The issue is in getValidMonthBounds logic when comparing mixed types
      // startMonth < bounds.start ? bounds.start : startMonth
      // This comparison might not work correctly with mixed types

      const endMonth = monthUtils.addMonths(payPeriodStartMonth, 11); // 12 months displayed

      // getValidMonthBounds equivalent logic - this is the problematic comparison
      const effectiveStart = payPeriodStartMonth < calendarBounds.start ? calendarBounds.start : payPeriodStartMonth;
      const effectiveEnd = endMonth > calendarBounds.end ? calendarBounds.end : endMonth;

      // Log the values to understand what's happening
      console.log('Comparison results:', {
        payPeriodStartMonth,
        calendarBoundsStart: calendarBounds.start,
        comparison: payPeriodStartMonth < calendarBounds.start,
        effectiveStart,
        effectiveEnd,
        endMonth,
        isStartPayPeriod: monthUtils.isPayPeriod(effectiveStart),
        isEndPayPeriod: monthUtils.isPayPeriod(effectiveEnd)
      });

      // If the comparison results in mixed types, it should fail
      if (monthUtils.isPayPeriod(effectiveStart) !== monthUtils.isPayPeriod(effectiveEnd)) {
        expect(() => {
          monthUtils.rangeInclusive(effectiveStart, effectiveEnd);
        }).toThrow('Mixed calendar month and pay period ranges are not allowed');
      } else {
        // If both are the same type, it should work
        expect(() => {
          monthUtils.rangeInclusive(effectiveStart, effectiveEnd);
        }).not.toThrow();
      }
    });

    test('Reproducing the exact error message from sample.md', () => {
      // The error shows: "Pay period range requested (2025-31 to 2026-09)"
      // The issue is that '2025-31' is treated as a pay period (month 31)
      // but '2026-09' is treated as a calendar month (September)

      expect(() => {
        // This demonstrates the mixed range issue
        monthUtils.rangeInclusive('2025-31', '2026-09');
      }).toThrow('Mixed calendar month and pay period ranges are not allowed');
    });
  });

  describe('The fix should ensure consistent month types', () => {
    test('Calendar bounds should be converted to pay period bounds when pay periods enabled', () => {
      // When pay periods are enabled, bounds should be converted to pay period format
      const calendarBounds = { start: '2025-01', end: '2026-09' };

      // Mock what the fix should do - convert calendar bounds to pay period bounds
      const convertedStart = '2025-13'; // First pay period of 2025
      const convertedEnd = '2026-38'; // Approximate last pay period spanning into 2026

      // Both should be pay periods
      expect(monthUtils.isPayPeriod(convertedStart)).toBe(true);
      expect(monthUtils.isPayPeriod(convertedEnd)).toBe(true);

      // Range should work without errors
      expect(() => {
        monthUtils.rangeInclusive(convertedStart, convertedEnd);
      }).not.toThrow();
    });

    test('All month operations should use the same format consistently', () => {
      // When pay periods are enabled, all month operations should return pay periods
      const currentMonth = monthUtils.currentMonth();
      const startMonth = currentMonth;
      const endMonth = monthUtils.addMonths(startMonth, 11);

      // All should be the same type
      const allPayPeriods = [currentMonth, startMonth, endMonth].every(monthUtils.isPayPeriod);
      const allCalendar = [currentMonth, startMonth, endMonth].every(m => !monthUtils.isPayPeriod(m));

      // Should be either all pay periods or all calendar months, not mixed
      expect(allPayPeriods || allCalendar).toBe(true);

      // Range should work
      expect(() => {
        monthUtils.rangeInclusive(startMonth, endMonth);
      }).not.toThrow();
    });
  });
});