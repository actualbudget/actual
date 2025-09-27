import { describe, test, expect, beforeEach } from 'vitest';
import * as monthUtils from './months';
import { loadPayPeriodConfigFromPrefs } from './pay-periods';

describe('Month Comparison Minimal Fix', () => {
  beforeEach(() => {
    // Enable pay periods for testing
    loadPayPeriodConfigFromPrefs({
      showPayPeriods: 'true',
      payPeriodFrequency: 'biweekly',
      payPeriodStartDate: '2024-01-05'
    });
  });

  describe('isBefore function with mixed month types', () => {
    test('Should throw clear error for mixed month types', () => {
      expect(() => {
        monthUtils.isBefore('2025-31', '2026-09'); // pay period vs calendar month
      }).toThrow('Cannot compare mixed month types');

      expect(() => {
        monthUtils.isBefore('2025-31', '2026-09');
      }).toThrow("'2025-31' (pay period) vs '2026-09' (calendar month)");
    });

    test('Should work correctly for same month types - pay periods', () => {
      expect(monthUtils.isBefore('2025-13', '2025-14')).toBe(true);
      expect(monthUtils.isBefore('2025-31', '2025-32')).toBe(true);
      expect(monthUtils.isBefore('2025-32', '2025-31')).toBe(false);
    });

    test('Should work correctly for same month types - calendar months', () => {
      expect(monthUtils.isBefore('2025-01', '2025-02')).toBe(true);
      expect(monthUtils.isBefore('2025-12', '2026-01')).toBe(true);
      expect(monthUtils.isBefore('2026-01', '2025-12')).toBe(false);
    });
  });

  describe('isAfter function with mixed month types', () => {
    test('Should throw clear error for mixed month types', () => {
      expect(() => {
        monthUtils.isAfter('2025-31', '2026-09'); // pay period vs calendar month
      }).toThrow('Cannot compare mixed month types');

      expect(() => {
        monthUtils.isAfter('2026-09', '2025-31'); // calendar month vs pay period
      }).toThrow("'2026-09' (calendar month) vs '2025-31' (pay period)");
    });

    test('Should work correctly for same month types - pay periods', () => {
      expect(monthUtils.isAfter('2025-14', '2025-13')).toBe(true);
      expect(monthUtils.isAfter('2025-32', '2025-31')).toBe(true);
      expect(monthUtils.isAfter('2025-31', '2025-32')).toBe(false);
    });

    test('Should work correctly for same month types - calendar months', () => {
      expect(monthUtils.isAfter('2025-02', '2025-01')).toBe(true);
      expect(monthUtils.isAfter('2026-01', '2025-12')).toBe(true);
      expect(monthUtils.isAfter('2025-12', '2026-01')).toBe(false);
    });
  });

  describe('Integration with range functions', () => {
    test('Should prevent the original error scenario through comparison functions', () => {
      // This tests that the comparison functions catch mixed types before they reach _range
      expect(() => {
        // This would previously create a mixed range error
        // Now it should fail at the comparison level with a clearer message
        monthUtils.isBefore('2025-31', '2026-09');
      }).toThrow('Cannot compare mixed month types');
    });

    test('Should allow proper same-type ranges', () => {
      // Pay period ranges should work
      expect(() => {
        monthUtils.rangeInclusive('2025-13', '2025-15');
      }).not.toThrow();

      // Calendar month ranges should work
      expect(() => {
        monthUtils.rangeInclusive('2025-01', '2025-03');
      }).not.toThrow();
    });
  });

  describe('Date conversion handling', () => {
    test('Should handle Date objects correctly', () => {
      const date1 = new Date('2025-01-15');
      const date2 = new Date('2025-02-15');

      expect(monthUtils.isBefore(date1, date2)).toBe(true);
      expect(monthUtils.isAfter(date2, date1)).toBe(true);
    });

    test('Should handle mixed Date and string correctly for same types', () => {
      const date1 = new Date('2025-01-15');
      const monthStr = '2025-02';

      expect(monthUtils.isBefore(date1, monthStr)).toBe(true);
      expect(monthUtils.isAfter(monthStr, date1)).toBe(true);
    });
  });
});