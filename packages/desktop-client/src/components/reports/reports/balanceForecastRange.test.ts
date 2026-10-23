import type { BalanceForecastWidget } from '@actual-app/core/types/models';
import type { ForecastResult } from '@actual-app/core/types/models/forecast';
import { describe, expect, it } from 'vitest';

import {
  buildBalanceForecastChartData,
  countForecastScheduledOccurrences,
} from './balanceForecastChartData';
import {
  buildFromTodayForecastPresets,
  getForecastRangeFromToday,
  resolveBalanceForecastRange,
} from './balanceForecastRange';

describe('forecast ranges from today', () => {
  it.each([
    ['2026-10-13', 3, '2027-01-12'],
    ['2026-10-13', 6, '2027-04-12'],
    ['2026-10-13', 12, '2027-10-12'],
    ['2026-10-01', 6, '2027-03-31'],
    ['2026-08-31', 6, '2027-02-27'],
    ['2023-08-31', 6, '2024-02-28'],
    ['2024-02-29', 12, '2025-02-27'],
    ['2026-12-31', 3, '2027-03-30'],
  ])('starts on %s and includes %i months through %s', (today, months, end) => {
    expect(getForecastRangeFromToday(months, today)).toEqual([today, end]);
  });

  it('reopens the same saved widget with a new current date', () => {
    const meta: BalanceForecastWidget['meta'] = {
      timeFrame: {
        start: '2026-10-13',
        end: '2027-04-12',
        mode: 'static',
      },
      monthsFromToday: 6,
    };

    expect(
      resolveBalanceForecastRange(meta, 'schedules', '2026-11-02'),
    ).toEqual({
      start: '2026-11-02',
      end: '2027-05-01',
      startDate: '2026-11-02',
      endDate: '2027-05-01',
      monthsFromToday: 6,
    });
  });

  it('keeps existing saved month ranges fixed', () => {
    expect(
      resolveBalanceForecastRange(
        { timeFrame: { start: '2025-10', end: '2026-03', mode: 'static' } },
        'schedules',
        '2026-10-13',
      ),
    ).toEqual({
      start: '2025-10',
      end: '2026-03',
      startDate: '2025-10-01',
      endDate: '2026-03-31',
      monthsFromToday: undefined,
    });
  });

  it('uses legacy saved dates when there is no timeFrame', () => {
    expect(
      resolveBalanceForecastRange({ startDate: '2025-11', endDate: '2026-01' }),
    ).toMatchObject({ start: '2025-11', end: '2026-01' });
  });

  it('preserves the whole-month query for existing custom day ranges', () => {
    expect(
      resolveBalanceForecastRange({
        timeFrame: { start: '2026-10-13', end: '2027-04-12', mode: 'static' },
      }),
    ).toMatchObject({
      start: '2026-10-13',
      end: '2027-04-12',
      startDate: '2026-10-01',
      endDate: '2027-04-30',
    });
  });

  it('keeps new forecasts on the existing twelve-calendar-month default', () => {
    expect(
      resolveBalanceForecastRange(null, 'schedules', '2026-10-13'),
    ).toEqual({
      start: '2026-10',
      end: '2027-09',
      startDate: '2026-10-01',
      endDate: '2027-09-30',
      monthsFromToday: undefined,
    });
  });

  it('ignores rolling dates for Tracking Budget forecasts', () => {
    expect(
      resolveBalanceForecastRange(
        {
          timeFrame: { start: '2026-10', end: '2027-03', mode: 'static' },
          monthsFromToday: 6,
        },
        'tracking-budget',
        '2026-10-13',
      ),
    ).toMatchObject({
      startDate: '2026-10-01',
      endDate: '2027-03-31',
      monthsFromToday: undefined,
    });
  });

  it.each([0, -1, 1.5, Infinity, NaN])(
    'ignores invalid saved durations (%s)',
    monthsFromToday => {
      expect(
        resolveBalanceForecastRange({ monthsFromToday }).monthsFromToday,
      ).toBeUndefined();
    },
  );

  it('saves the duration when a rolling preset is selected', () => {
    const selected: number[] = [];
    const presets = buildFromTodayForecastPresets(
      text => text,
      months => selected.push(months),
    );
    presets.forEach(preset => preset.onSelect());
    expect(selected).toEqual([3, 6, 12]);
    expect(presets[1].getRange()).toEqual(getForecastRangeFromToday(6));
  });

  it('summarizes partial months without extending the exact forecast request', () => {
    const range = resolveBalanceForecastRange(
      { monthsFromToday: 6 },
      'schedules',
      '2026-10-13',
    );
    const points = [
      ['2026-10-13', 323102],
      ['2026-10-31', 133102],
      ['2027-03-31', -876898],
      ['2027-04-12', -886898],
    ] as const;
    const forecastData: ForecastResult = {
      forecastStartDate: range.startDate,
      forecastEndDate: range.endDate,
      lowestBalance: {
        date: range.endDate,
        balance: -886898,
        accountId: '',
        accountName: '',
      },
      dataPoints: points.map(([date, balance]) => ({
        date,
        balance,
        accountId: 'checking',
        accountName: 'Checking',
        transactions: [
          {
            amount: -10000,
            payee: 'Rent',
            scheduleId: 'rent',
            scheduleName: 'Rent',
          },
        ],
      })),
    };
    const args = { forecastData, start: range.start, end: range.end };
    const daily = buildBalanceForecastChartData({
      ...args,
      granularity: 'Daily',
    });
    const monthly = buildBalanceForecastChartData({
      ...args,
      granularity: 'Monthly',
    });

    expect(daily[0]).toEqual({ date: '2026-10-13', balance: 323102 });
    expect(daily.at(-1)).toEqual({ date: '2027-04-12', balance: -886898 });
    expect(monthly[0]).toEqual({ date: '2026-10', balance: 133102 });
    expect(monthly.at(-1)).toEqual({ date: '2027-04', balance: -886898 });
    expect(monthly).toHaveLength(7);
    expect(
      countForecastScheduledOccurrences({ ...args, granularity: 'Daily' }),
    ).toBe(4);
    expect(
      countForecastScheduledOccurrences({ ...args, granularity: 'Monthly' }),
    ).toBe(4);
  });
});
