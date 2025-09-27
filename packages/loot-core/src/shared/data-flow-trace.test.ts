/**
 * TDD Test: Trace Data Flow for Mixed Range Issue
 *
 * This test traces where the values '2025-31' and '2026-09' come from
 * in the data flow from BudgetTable → MonthsProvider → rangeInclusive
 */

import * as monthUtils from './months';

describe('Data Flow Trace for Mixed Range Issue', () => {
  beforeEach(() => {
    monthUtils.setPayPeriodConfig({
      enabled: true,
      payFrequency: 'biweekly',
      startDate: '2025-01-01',
      endDate: null,
      payDates: [],
    });
  });

  describe('Tracing MonthsProvider Data Flow', () => {
    test('TRACE: What happens when MonthsProvider gets mixed bounds?', () => {
      // Simulate the exact scenario from BudgetTable.tsx
      const startMonth = '2025-31'; // Pay period
      const numMonths = 12;
      const monthBounds = {
        start: '2025-01', // Calendar month
        end: '2026-12'    // Calendar month
      };

      // Calculate what MonthsProvider would do
      const endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
      console.log('TRACE - startMonth:', startMonth);
      console.log('TRACE - numMonths:', numMonths);
      console.log('TRACE - calculated endMonth:', endMonth);
      console.log('TRACE - monthBounds:', monthBounds);

      // This should fail because getValidMonthBounds doesn't handle mixed types
      expect(() => {
        const bounds = {
          start: startMonth < monthBounds.start ? monthBounds.start : startMonth,
          end: endMonth > monthBounds.end ? monthBounds.end : endMonth,
        };
        console.log('TRACE - final bounds:', bounds);
        monthUtils.rangeInclusive(bounds.start, bounds.end);
      }).toThrow(/Mixed calendar month and pay period ranges/);
    });

    test('TRACE: How does addMonths work with pay periods?', () => {
      const startMonth = '2025-31';
      const result = monthUtils.addMonths(startMonth, 11);
      console.log('TRACE - addMonths result:', result);

      // Test hypothesis: addMonths on pay period should return pay period
      expect(monthUtils.isPayPeriod(result)).toBe(true);
    });

    test('TRACE: What happens in string comparison with mixed types?', () => {
      const payPeriod = '2025-31';
      const calendarMonth = '2025-01';

      console.log('TRACE - payPeriod < calendarMonth:', payPeriod < calendarMonth);
      console.log('TRACE - payPeriod > calendarMonth:', payPeriod > calendarMonth);

      // This shows that string comparison doesn't work well with mixed types
      expect(payPeriod < calendarMonth).toBe(false); // '31' > '01'
    });

    test('TRACE: Reproduce exact scenario that creates 2025-31 to 2026-09', () => {
      // Test what could create this specific scenario
      const startMonth = '2025-31';
      const monthBounds = {
        start: '2025-01',
        end: '2026-09'  // This could come from a 9-month range ending in September
      };

      const endMonth = monthUtils.addMonths(startMonth, 11); // 12 months total
      console.log('TRACE - endMonth from addMonths:', endMonth);

      // Simulate getValidMonthBounds logic
      const finalEnd = endMonth > monthBounds.end ? monthBounds.end : endMonth;
      console.log('TRACE - finalEnd after bounds check:', finalEnd);

      // This should show us how we get 2026-09 as the end
      expect(finalEnd).toBe('2026-09');
    });
  });

  describe('Testing the derivedBounds Fix', () => {
    test('HYPOTHESIS: derivedBounds conversion should prevent mixed ranges', () => {
      // Simulate the derivedBounds logic from index.tsx
      const bounds = {
        start: '2025-01',
        end: '2026-09'
      };

      // Test the conversion logic
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

      const converted = {
        start: convertMonthToPayPeriod(bounds.start),
        end: convertMonthToPayPeriod(bounds.end),
      };

      console.log('TRACE - original bounds:', bounds);
      console.log('TRACE - converted bounds:', converted);

      // This should work because both are pay periods now
      expect(() => {
        monthUtils.rangeInclusive(converted.start, converted.end);
      }).not.toThrow();
    });
  });
});