import { describe, test, expect, beforeEach } from 'vitest';

import { getValidMonthBounds } from './MonthsContext';

// Mock the monthUtils import
const mockMonthUtils = {
  isPayPeriod: (monthId: string): boolean => {
    if (
      typeof monthId !== 'string' ||
      monthId.length < 7 ||
      monthId[4] !== '-'
    ) {
      return false;
    }
    const mm = parseInt(monthId.slice(5, 7));
    return Number.isFinite(mm) && mm >= 13 && mm <= 99;
  },
};

// Mock the loot-core/shared/months import
vi.mock('loot-core/shared/months', () => mockMonthUtils);

describe('getValidMonthBounds', () => {
  describe('Mixed month type handling', () => {
    test('Should handle pay period start/end with calendar bounds', () => {
      const calendarBounds = { start: '2025-01', end: '2026-09' };
      const payPeriodStart = '2025-31';
      const payPeriodEnd = '2025-32';

      const result = getValidMonthBounds(
        calendarBounds,
        payPeriodStart,
        payPeriodEnd,
      );

      // Should prefer the pay period values to maintain consistency
      expect(result.start).toBe(payPeriodStart);
      expect(result.end).toBe(payPeriodEnd);

      // Both should be pay periods
      expect(mockMonthUtils.isPayPeriod(result.start)).toBe(true);
      expect(mockMonthUtils.isPayPeriod(result.end)).toBe(true);
    });

    test('Should handle calendar start/end with calendar bounds', () => {
      const calendarBounds = { start: '2025-01', end: '2026-09' };
      const calendarStart = '2025-03';
      const calendarEnd = '2025-08';

      const result = getValidMonthBounds(
        calendarBounds,
        calendarStart,
        calendarEnd,
      );

      // Should use original logic for same types
      expect(result.start).toBe(calendarStart);
      expect(result.end).toBe(calendarEnd);

      // Both should be calendar months
      expect(mockMonthUtils.isPayPeriod(result.start)).toBe(false);
      expect(mockMonthUtils.isPayPeriod(result.end)).toBe(false);
    });

    test('Should handle pay period bounds with pay period start/end', () => {
      const payPeriodBounds = { start: '2025-13', end: '2025-38' };
      const payPeriodStart = '2025-15';
      const payPeriodEnd = '2025-20';

      const result = getValidMonthBounds(
        payPeriodBounds,
        payPeriodStart,
        payPeriodEnd,
      );

      // Should use original logic for same types
      expect(result.start).toBe(payPeriodStart);
      expect(result.end).toBe(payPeriodEnd);

      // Both should be pay periods
      expect(mockMonthUtils.isPayPeriod(result.start)).toBe(true);
      expect(mockMonthUtils.isPayPeriod(result.end)).toBe(true);
    });

    test('Should prevent the exact error scenario: 2025-31 to 2026-09', () => {
      // This reproduces the exact problematic scenario from the error
      // The issue was that getValidMonthBounds could return:
      // - start: '2025-31' (pay period)
      // - end: '2026-09' (calendar month from bounds.end)
      const calendarBounds = { start: '2025-01', end: '2026-09' };
      const payPeriodStart = '2025-31';

      // This simulates what addMonths might return that triggers the issue
      // If addMonths on a pay period creates an end month that's beyond calendar bounds,
      // the old logic would clip to bounds.end (calendar month)
      const payPeriodEndBeyondBounds = '2027-15'; // Pay period beyond calendar bounds

      const result = getValidMonthBounds(
        calendarBounds,
        payPeriodStart,
        payPeriodEndBeyondBounds,
      );

      // Should maintain consistency by using pay period values
      expect(result.start).toBe(payPeriodStart); // '2025-31'
      expect(result.end).toBe(payPeriodEndBeyondBounds); // Should NOT clip to '2026-09'

      // Both should be pay periods, preventing the mixed range error
      expect(mockMonthUtils.isPayPeriod(result.start)).toBe(true);
      expect(mockMonthUtils.isPayPeriod(result.end)).toBe(true);

      // The problematic result should NOT happen
      expect(!(result.start === '2025-31' && result.end === '2026-09')).toBe(
        true,
      );
    });

    test('Should handle undefined startMonth', () => {
      const calendarBounds = { start: '2025-01', end: '2026-09' };
      const payPeriodEnd = '2025-31';

      const result = getValidMonthBounds(
        calendarBounds,
        undefined,
        payPeriodEnd,
      );

      // Should handle undefined gracefully and maintain consistency
      expect(result.start).toBe(calendarBounds.start);
      expect(result.end).toBe(payPeriodEnd);
    });

    test('Should handle bounds clipping for calendar months', () => {
      const calendarBounds = { start: '2025-06', end: '2025-08' };
      const calendarStart = '2025-01'; // Before bounds
      const calendarEnd = '2025-12'; // After bounds

      const result = getValidMonthBounds(
        calendarBounds,
        calendarStart,
        calendarEnd,
      );

      // Should clip to bounds
      expect(result.start).toBe(calendarBounds.start);
      expect(result.end).toBe(calendarBounds.end);
    });
  });
});
