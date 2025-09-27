import { describe, test, expect, beforeEach } from 'vitest';
import * as monthUtils from './months';
import { loadPayPeriodConfigFromPrefs } from './pay-periods';

describe('Root Cause Solution Verification', () => {
  beforeEach(() => {
    // Enable pay periods for testing
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });
  });

  describe('Original error scenario is now impossible', () => {
    test('addMonths with pay period input always returns pay period', () => {
      // The original error was: addMonths('2025-31', n) returning calendar month '2027-07'
      // Now it should always return a pay period

      const result1 = monthUtils.addMonths('2025-31', 10);
      const result2 = monthUtils.addMonths('2025-31', 25);
      const result3 = monthUtils.addMonths('2025-31', 50);

      // All results should be pay periods
      expect(monthUtils.isPayPeriod(result1)).toBe(true);
      expect(monthUtils.isPayPeriod(result2)).toBe(true);
      expect(monthUtils.isPayPeriod(result3)).toBe(true);

      // None should be calendar months like '2027-07'
      expect(result1).not.toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      expect(result2).not.toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      expect(result3).not.toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    });

    test('MonthsProvider scenario now works correctly', () => {
      // Simulate the MonthsProvider flow that was causing the error
      const startMonth = '2025-31'; // Pay period
      const numMonths = 20;

      // This is what MonthsProvider does: addMonths(startMonth, numMonths - 1)
      const endMonth = monthUtils.addMonths(startMonth, numMonths - 1);

      console.log('MonthsProvider simulation:', {
        startMonth,
        endMonth,
        startIsPayPeriod: monthUtils.isPayPeriod(startMonth),
        endIsPayPeriod: monthUtils.isPayPeriod(endMonth)
      });

      // Both should be pay periods now
      expect(monthUtils.isPayPeriod(startMonth)).toBe(true);
      expect(monthUtils.isPayPeriod(endMonth)).toBe(true);

      // Range should work without mixed type errors
      expect(() => {
        monthUtils.rangeInclusive(startMonth, endMonth);
      }).not.toThrow();
    });

    test('All month arithmetic functions maintain pay period consistency', () => {
      const payPeriod = '2025-31';

      // All these should return pay periods
      const next = monthUtils.nextMonth(payPeriod);
      const prev = monthUtils.prevMonth(payPeriod);
      const added = monthUtils.addMonths(payPeriod, 5);
      const subtracted = monthUtils.subMonths(payPeriod, 3);

      expect(monthUtils.isPayPeriod(next)).toBe(true);
      expect(monthUtils.isPayPeriod(prev)).toBe(true);
      expect(monthUtils.isPayPeriod(added)).toBe(true);
      expect(monthUtils.isPayPeriod(subtracted)).toBe(true);

      console.log('Pay period arithmetic results:', {
        original: payPeriod,
        next,
        prev,
        added,
        subtracted
      });
    });
  });

  describe('Clear error messages when config is missing', () => {
    test('Pay period functions give helpful errors when config unavailable', () => {
      // Disable pay periods temporarily
      loadPayPeriodConfigFromPrefs({
        showPayPeriods: 'false',
        payPeriodFrequency: 'biweekly',
        payPeriodStartDate: '2024-01-05'
      });

      expect(() => {
        monthUtils.addMonths('2025-31', 5);
      }).toThrow('Pay period 2025-31 requires enabled pay period configuration');

      expect(() => {
        monthUtils.nextMonth('2025-31');
      }).toThrow('Pay period 2025-31 requires enabled pay period configuration');

      expect(() => {
        monthUtils.prevMonth('2025-31');
      }).toThrow('Pay period 2025-31 requires enabled pay period configuration');
    });
  });

  describe('Calendar months continue to work normally', () => {
    test('Calendar month arithmetic is unaffected', () => {
      const calMonth = '2025-06';

      const next = monthUtils.nextMonth(calMonth);
      const prev = monthUtils.prevMonth(calMonth);
      const added = monthUtils.addMonths(calMonth, 5);
      const subtracted = monthUtils.subMonths(calMonth, 3);

      // All should be calendar months
      expect(monthUtils.isPayPeriod(next)).toBe(false);
      expect(monthUtils.isPayPeriod(prev)).toBe(false);
      expect(monthUtils.isPayPeriod(added)).toBe(false);
      expect(monthUtils.isPayPeriod(subtracted)).toBe(false);

      // Check actual values
      expect(next).toBe('2025-07');
      expect(prev).toBe('2025-05');
      expect(added).toBe('2025-11');
      expect(subtracted).toBe('2025-03');
    });
  });
});