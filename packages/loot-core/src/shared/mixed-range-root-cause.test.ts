/**
 * TDD Test: Root Cause Investigation - Mixed Range Creation
 *
 * This test traces the exact point where the mixed range is created
 */

import * as monthUtils from './months';

describe('Root Cause Investigation - Mixed Range Creation', () => {
  beforeEach(() => {
    monthUtils.setPayPeriodConfig({
      enabled: true,
      payFrequency: 'biweekly',
      startDate: '2025-01-01',
      endDate: null,
      payDates: [],
    });
  });

  test('ROOT CAUSE: Exact scenario that creates 2025-31 to 2026-09', () => {
    // This simulates the exact code from MonthsContext.tsx getValidMonthBounds
    const startMonth = '2025-31'; // Pay period start
    const numMonths = 12;
    const monthBounds = {
      start: '2025-01', // Calendar month bounds
      end: '2026-09'    // Calendar month bounds - this is the problem!
    };

    // Step 1: Calculate end month (this works correctly)
    const endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
    expect(endMonth).toBe('2026-16'); // Pay period
    expect(monthUtils.isPayPeriod(endMonth)).toBe(true);

    // Step 2: Apply bounds validation (THIS IS WHERE THE PROBLEM OCCURS)
    const finalStart = startMonth < monthBounds.start ? monthBounds.start : startMonth;
    const finalEnd = endMonth > monthBounds.end ? monthBounds.end : endMonth;

    // The issue: String comparison between pay period and calendar month
    console.log('String comparison results:');
    console.log('startMonth < monthBounds.start:', startMonth, '<', monthBounds.start, '=', startMonth < monthBounds.start);
    console.log('endMonth > monthBounds.end:', endMonth, '>', monthBounds.end, '=', endMonth > monthBounds.end);

    expect(finalStart).toBe('2025-31'); // Should remain pay period
    expect(finalEnd).toBe('2026-09');   // THIS IS THE PROBLEM - becomes calendar month!

    // This is where the mixed range gets created
    expect(monthUtils.isPayPeriod(finalStart)).toBe(true);
    expect(monthUtils.isPayPeriod(finalEnd)).toBe(false); // MIXED!

    // And this is where it fails
    expect(() => {
      monthUtils.rangeInclusive(finalStart, finalEnd);
    }).toThrow(/Mixed calendar month and pay period ranges/);
  });

  test('ROOT CAUSE: String comparison is the culprit', () => {
    // The problem: String comparison doesn't work properly with mixed types
    const payPeriod = '2026-16';
    const calendarMonth = '2026-09';

    // String comparison treats this as: '16' vs '09'
    // '16' > '09' is true, so it thinks the pay period is "greater"
    const comparison = payPeriod > calendarMonth;
    expect(comparison).toBe(true);

    // This causes the bounds validation to incorrectly cap at calendar month
    const finalEnd = comparison ? calendarMonth : payPeriod;
    expect(finalEnd).toBe('2026-09'); // Wrong! Should be pay period equivalent
  });

  test('SOLUTION VERIFICATION: derivedBounds should prevent this', () => {
    // Test the derivedBounds logic that should fix this
    const originalBounds = {
      start: '2025-01',
      end: '2026-09'
    };

    // Simulate the derivedBounds conversion from index.tsx
    const convertMonthToPayPeriod = (monthStr: string) => {
      const mm = parseInt(monthStr.slice(5, 7));
      if (Number.isFinite(mm) && mm >= 13) return monthStr;

      const year = parseInt(monthStr.slice(0, 4));
      const month = parseInt(monthStr.slice(5, 7));

      if (month <= 6) {
        return `${year}-13`;
      } else {
        return `${year}-38`;
      }
    };

    const convertedBounds = {
      start: convertMonthToPayPeriod(originalBounds.start),
      end: convertMonthToPayPeriod(originalBounds.end),
    };

    expect(convertedBounds).toEqual({
      start: '2025-13',
      end: '2026-38'
    });

    // Now the same scenario should work
    const startMonth = '2025-31';
    const endMonth = monthUtils.addMonths(startMonth, 11);

    const finalStart = startMonth < convertedBounds.start ? convertedBounds.start : startMonth;
    const finalEnd = endMonth > convertedBounds.end ? convertedBounds.end : endMonth;

    // Both should be pay periods now
    expect(monthUtils.isPayPeriod(finalStart)).toBe(true);
    expect(monthUtils.isPayPeriod(finalEnd)).toBe(true);

    // Should not throw
    expect(() => {
      monthUtils.rangeInclusive(finalStart, finalEnd);
    }).not.toThrow();
  });
});