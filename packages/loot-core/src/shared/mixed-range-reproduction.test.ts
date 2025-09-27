/**
 * TDD Test: Reproduce Mixed Range Error
 *
 * This test reproduces the exact error scenario:
 * "Mixed calendar month and pay period ranges are not allowed.
 * Range from '2025-31' (pay period) to '2026-09' (calendar month) is invalid."
 */

import * as monthUtils from './months';

describe('Mixed Range Error Reproduction', () => {
  beforeEach(() => {
    // Setup pay period configuration for testing
    monthUtils.setPayPeriodConfig({
      enabled: true,
      payFrequency: 'biweekly',
      startDate: '2025-01-01',
      endDate: null,
      payDates: [],
    });
  });

  test('REPRODUCTION: should fail with exact error when creating range from 2025-31 to 2026-09', () => {
    // This should reproduce the exact error from the stack trace
    expect(() => {
      monthUtils.rangeInclusive('2025-31', '2026-09');
    }).toThrow(
      "Mixed calendar month and pay period ranges are not allowed. Range from '2025-31' (pay period) to '2026-09' (calendar month) is invalid."
    );
  });

  test('HYPOTHESIS: Check if 2025-31 is correctly identified as pay period', () => {
    expect(monthUtils.isPayPeriod('2025-31')).toBe(true);
  });

  test('HYPOTHESIS: Check if 2026-09 is correctly identified as calendar month', () => {
    expect(monthUtils.isPayPeriod('2026-09')).toBe(false);
  });

  test('CONTROL: Verify similar calendar range works', () => {
    // This should work - both calendar months
    expect(() => {
      monthUtils.rangeInclusive('2025-01', '2026-09');
    }).not.toThrow();
  });

  test('CONTROL: Verify similar pay period range works', () => {
    // This should work - both pay periods
    expect(() => {
      monthUtils.rangeInclusive('2025-31', '2026-31');
    }).not.toThrow();
  });
});