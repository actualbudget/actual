import * as monthUtils from './months';
import { setPayPeriodConfig, type PayPeriodConfig } from './pay-periods';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

describe('pay period integration', () => {
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
    const payPeriodLabel = monthUtils.getMonthLabel('2024-13', payPeriodConfig);
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
