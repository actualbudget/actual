import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import * as monthUtils from './months';
import { setPayPeriodConfig, type PayPeriodConfig } from './pay-periods';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

describe('Pay Period Integration with Month Utilities', () => {
  const payPeriodConfig: PayPeriodConfig = {
    enabled: true,
    payFrequency: 'biweekly',
    startDate: '2024-01-05',
  };

  beforeEach(() => {
    setPayPeriodConfig(payPeriodConfig);
  });

  afterEach(() => {
    setPayPeriodConfig({
      enabled: false,
      payFrequency: 'biweekly',
      startDate: '2024-01-05',
    });
  });

  describe('Basic Month Utilities', () => {
    test('isPayPeriod correctly identifies pay period months', () => {
      expect(monthUtils.isPayPeriod('2024-01')).toBe(false);
      expect(monthUtils.isPayPeriod('2024-12')).toBe(false);
      expect(monthUtils.isPayPeriod('2024-13')).toBe(true);
      expect(monthUtils.isPayPeriod('2024-99')).toBe(true);
    });

    test('addMonths works with pay periods', () => {
      expect(monthUtils.addMonths('2024-13', 1)).toBe('2024-14');
      // When going backwards from pay period, it should go to previous pay period
      expect(monthUtils.addMonths('2024-13', -1)).toBe('2023-38'); // Previous year's last pay period
    });

    test('range generation works with pay periods', () => {
      const range = monthUtils.range('2024-13', '2024-15');
      expect(range).toContain('2024-13');
      expect(range).toContain('2024-14');
      // Note: range is exclusive of end, so 2024-15 won't be included
      expect(range).not.toContain('2024-15');
    });

    test('getMonthLabel returns appropriate labels', () => {
      // Calendar month
      expect(monthUtils.getMonthLabel('2024-01')).toContain('January');

      // Pay period
      const payPeriodLabel = monthUtils.getMonthLabel(
        '2024-13',
        payPeriodConfig,
      );
      expect(payPeriodLabel).toContain('Pay Period');
    });

    test('end-to-end pay period integration', () => {
      // Test that pay periods work with all month utilities
      const payPeriodMonth = '2024-13';

      // Month detection
      expect(monthUtils.isPayPeriod(payPeriodMonth)).toBe(true);

      // Month navigation
      expect(monthUtils.nextMonth(payPeriodMonth)).toBe('2024-14');
      expect(monthUtils.prevMonth(payPeriodMonth)).toBe('2023-38'); // Previous year's last period

      // Month arithmetic
      expect(monthUtils.addMonths(payPeriodMonth, 2)).toBe('2024-15');
      expect(monthUtils.subMonths(payPeriodMonth, 1)).toBe('2023-38');

      // Month range generation
      const range = monthUtils.range(payPeriodMonth, '2024-15');
      expect(range).toContain('2024-13');
      expect(range).toContain('2024-14');
      expect(range).not.toContain('2024-15'); // Exclusive end

      // Month labels and display
      const label = monthUtils.getMonthLabel(payPeriodMonth, payPeriodConfig);
      expect(label).toContain('Pay Period');

      const displayName = monthUtils.getMonthDisplayName(
        payPeriodMonth,
        payPeriodConfig,
      );
      expect(displayName).toMatch(/Jan-\d+/); // Should be "Jan-1" or similar

      const dateRange = monthUtils.getMonthDateRange(
        payPeriodMonth,
        payPeriodConfig,
      );
      expect(dateRange).toMatch(/\w{3} \d+ - \w{3} \d+/); // Should be "Jan 5 - Jan 18" format
    });
  });

  describe('Month Comparison Functions', () => {
    test('isBefore works correctly for same month types - pay periods', () => {
      expect(monthUtils.isBefore('2025-13', '2025-14')).toBe(true);
      expect(monthUtils.isBefore('2025-31', '2025-32')).toBe(true);
      expect(monthUtils.isBefore('2025-32', '2025-31')).toBe(false);
    });

    test('isBefore works correctly for same month types - calendar months', () => {
      expect(monthUtils.isBefore('2025-01', '2025-02')).toBe(true);
      expect(monthUtils.isBefore('2025-12', '2026-01')).toBe(true);
      expect(monthUtils.isBefore('2026-01', '2025-12')).toBe(false);
    });

    test('isAfter works correctly for same month types - pay periods', () => {
      expect(monthUtils.isAfter('2025-14', '2025-13')).toBe(true);
      expect(monthUtils.isAfter('2025-32', '2025-31')).toBe(true);
      expect(monthUtils.isAfter('2025-31', '2025-32')).toBe(false);
    });

    test('isAfter works correctly for same month types - calendar months', () => {
      expect(monthUtils.isAfter('2025-02', '2025-01')).toBe(true);
      expect(monthUtils.isAfter('2026-01', '2025-12')).toBe(true);
      expect(monthUtils.isAfter('2025-12', '2026-01')).toBe(false);
    });

    test('handles Date objects correctly', () => {
      const date1 = new Date('2025-01-15');
      const date2 = new Date('2025-02-15');

      expect(monthUtils.isBefore(date1, date2)).toBe(true);
      expect(monthUtils.isAfter(date2, date1)).toBe(true);
    });

    test('handles mixed Date and string correctly for same types', () => {
      const date1 = new Date('2025-01-15');
      const monthStr = '2025-02';

      expect(monthUtils.isBefore(date1, monthStr)).toBe(true);
      expect(monthUtils.isAfter(monthStr, date1)).toBe(true);
    });
  });

  describe('Range Validation and Mixed Type Prevention', () => {
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

    test('Same month types with different years work', () => {
      // Pay periods across years should work
      const crossYearPay = monthUtils.range('2023-35', '2024-15');
      expect(crossYearPay.every(m => monthUtils.isPayPeriod(m))).toBe(true);
      expect(crossYearPay.length).toBeGreaterThan(0);

      // Should contain periods from both years
      expect(crossYearPay.some(m => m.startsWith('2023-'))).toBe(true);
      expect(crossYearPay.some(m => m.startsWith('2024-'))).toBe(true);
    });

    test('Empty ranges handled correctly', () => {
      // Same calendar month (empty range)
      expect(monthUtils.range('2024-01', '2024-01')).toEqual([]);

      // Same pay period (empty range)
      expect(monthUtils.range('2024-13', '2024-13')).toEqual([]);
    });

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

    test('pay-period arithmetic never produces calendar month identifiers', () => {
      const startPeriod = '2025-13';

      for (let offset = 0; offset <= 30; offset++) {
        const result = monthUtils.addMonths(startPeriod, offset);
        expect(monthUtils.isPayPeriod(result)).toBe(true);
        expect(result).not.toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      }
    });
  });

  describe('_parse() Auto-conversion', () => {
    test('correctly parses pay period IDs to start dates', () => {
      // Pay period 2024-13 (first biweekly period) starts Jan 5, 2024
      const result = monthUtils._parse('2024-13');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January (0-indexed)
      expect(result.getDate()).toBe(5);
    });

    test('correctly parses pay period IDs later in the year', () => {
      // Pay period 2024-14 (second biweekly period) starts Jan 19, 2024
      const result = monthUtils._parse('2024-14');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(19);
    });

    test('correctly parses pay period IDs from different years', () => {
      // Pay period 2025-13 (first period of 2025) starts Jan 3, 2025
      const result = monthUtils._parse('2025-13');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(3);
    });

    test('does not interfere with calendar month parsing', () => {
      // Calendar months should still work as before
      const result = monthUtils._parse('2024-10');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(9); // October (0-indexed)
      expect(result.getDate()).toBe(1); // First day of month
    });

    test('does not interfere with full date parsing', () => {
      // Full dates like "2024-10-15" should work normally
      const result = monthUtils._parse('2024-10-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(9); // October
      expect(result.getDate()).toBe(15);
    });

    test('does not interfere with year-only parsing', () => {
      // Year-only strings should still work
      const result = monthUtils._parse('2024');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });

    test('handles Date objects unchanged', () => {
      const inputDate = new Date(2024, 9, 15, 12); // Oct 15, 2024 at noon
      const result = monthUtils._parse(inputDate);
      expect(result).toBe(inputDate); // Should return same object
    });

    test('only processes strings of length 7 for pay period detection', () => {
      // Length check ensures we only process YYYY-MM format
      // Longer dates like "2024-32-01" won't trigger pay period logic
      const result = monthUtils._parse('2024-10-15');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(9); // October, not Aug (month 32)
      expect(result.getDate()).toBe(15);
    });
  });
});
