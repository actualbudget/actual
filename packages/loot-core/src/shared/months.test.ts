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
    setPayPeriodConfig({ enabled: false, payFrequency: 'biweekly', startDate: '2024-01-05' });
  });

  test('isPayPeriod correctly identifies pay period months', () => {
    expect(monthUtils.isPayPeriod('2024-01')).toBe(false);
    expect(monthUtils.isPayPeriod('2024-12')).toBe(false);
    expect(monthUtils.isPayPeriod('2024-13')).toBe(true);
    expect(monthUtils.isPayPeriod('2024-99')).toBe(true);
  });

  test('isCalendarMonth correctly identifies calendar months', () => {
    expect(monthUtils.isCalendarMonth('2024-01')).toBe(true);
    expect(monthUtils.isCalendarMonth('2024-12')).toBe(true);
    expect(monthUtils.isCalendarMonth('2024-13')).toBe(false);
    expect(monthUtils.isCalendarMonth('2024-99')).toBe(false);
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
});
