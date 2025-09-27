/**
 * TDD Test: Debug Data Flow - Direct Value Investigation
 *
 * This test directly investigates the values to understand the data flow
 */

import * as monthUtils from './months';

describe('Debug Data Flow - Direct Investigation', () => {
  beforeEach(() => {
    monthUtils.setPayPeriodConfig({
      enabled: true,
      payFrequency: 'biweekly',
      startDate: '2025-01-01',
      endDate: null,
      payDates: [],
    });
  });

  test('INVESTIGATION: Direct value tracing for mixed range scenario', () => {
    // Scenario: We start with pay period 2025-31 and want 12 months
    const startMonth = '2025-31';
    const numMonths = 12;

    // Calculate end month using addMonths
    const calculatedEndMonth = monthUtils.addMonths(startMonth, numMonths - 1);

    // Log actual values (these will show in test output)
    const isStartPayPeriod = monthUtils.isPayPeriod(startMonth);
    const isEndPayPeriod = monthUtils.isPayPeriod(calculatedEndMonth);

    // Use expect to show values in output
    expect({
      startMonth,
      calculatedEndMonth,
      isStartPayPeriod,
      isEndPayPeriod,
      numMonths
    }).toEqual({
      startMonth: '2025-31',
      calculatedEndMonth: expect.any(String), // We want to see what this actually is
      isStartPayPeriod: true,
      isEndPayPeriod: expect.any(Boolean),
      numMonths: 12
    });
  });

  test('INVESTIGATION: addMonths behavior on pay periods', () => {
    // Test addMonths with different inputs
    const testCases = [
      '2025-13', // First pay period of 2025
      '2025-31', // Mid-year pay period
      '2025-38'  // Last pay period of 2025
    ];

    const results = testCases.map(start => ({
      start,
      plus11: monthUtils.addMonths(start, 11),
      plus12: monthUtils.addMonths(start, 12),
      isStartPP: monthUtils.isPayPeriod(start),
      isPlus11PP: monthUtils.isPayPeriod(monthUtils.addMonths(start, 11)),
      isPlus12PP: monthUtils.isPayPeriod(monthUtils.addMonths(start, 12))
    }));

    // This will fail and show us the actual values
    expect(results).toEqual([
      {
        start: '2025-13',
        plus11: expect.stringMatching(/^202[56]-\d+$/),
        plus12: expect.stringMatching(/^202[56]-\d+$/),
        isStartPP: true,
        isPlus11PP: true,
        isPlus12PP: true
      }
    ]);
  });

  test('INVESTIGATION: Calendar month bounds scenario', () => {
    // Test what happens with calendar month bounds
    const calendarBounds = {
      start: '2025-01',
      end: '2026-09'
    };

    const payPeriodStart = '2025-31';
    const addedEnd = monthUtils.addMonths(payPeriodStart, 11);

    // Check string comparison behavior
    const comparisons = {
      payPeriodStart,
      addedEnd,
      calendarEnd: calendarBounds.end,
      isAddedEndGreaterThanCalendarEnd: addedEnd > calendarBounds.end,
      finalEnd: addedEnd > calendarBounds.end ? calendarBounds.end : addedEnd
    };

    // This will show us how we get the mixed range
    expect(comparisons).toEqual(expect.objectContaining({
      finalEnd: expect.any(String)
    }));
  });
});