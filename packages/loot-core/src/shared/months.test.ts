import type { PayPeriodConfig } from '#types/prefs';

import * as monthUtils from './months';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

describe('resolveStartMonth', () => {
  const enabledConfig: PayPeriodConfig = {
    enabled: true,
    payFrequency: 'biweekly',
    startDate: '2024-09-26',
  };

  test('calendar stored with pay periods disabled returns stored', () => {
    expect(monthUtils.resolveStartMonth('2026-04', undefined, '2026-01')).toBe(
      '2026-04',
    );
  });

  test('pay period stored with pay periods enabled returns stored', () => {
    expect(
      monthUtils.resolveStartMonth('2026-14', enabledConfig, '2026-01'),
    ).toBe('2026-14');
  });

  test('stale pay period stored with pay periods disabled returns fallback', () => {
    expect(monthUtils.resolveStartMonth('2026-14', undefined, '2026-04')).toBe(
      '2026-04',
    );
  });

  test('stale calendar stored with pay periods enabled returns fallback', () => {
    expect(
      monthUtils.resolveStartMonth('2026-04', enabledConfig, '2026-14'),
    ).toBe('2026-14');
  });
});
