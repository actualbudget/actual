import type {
  ForecastResult,
  ForecastSeries,
} from '@actual-app/core/types/models/forecast';
import { describe, expect, it } from 'vitest';

import { buildForecastSeriesChart } from './balanceForecastSeries';

function forecast(points: Array<[string, number, string?]>): ForecastResult {
  return {
    dataPoints: points.map(([date, balance, accountId = 'account']) => ({
      date,
      balance,
      accountId,
      accountName: accountId,
      transactions: [],
    })),
    lowestBalance: {
      date: '2026-10-01',
      balance: 0,
      accountId: '',
      accountName: '',
    },
    forecastStartDate: '2026-10-01',
    forecastEndDate: '2026-11-30',
  };
}

const series: ForecastSeries[] = [
  { id: 'checking', name: 'Cash', conditions: [], conditionsOp: 'and' },
  { id: 'card', name: 'Card', conditions: [], conditionsOp: 'and' },
];

describe('buildForecastSeriesChart', () => {
  it('keeps signed balances independent and carries each line into the visible daily range', () => {
    const result = buildForecastSeriesChart({
      series,
      start: '2026-10-02',
      end: '2026-10-04',
      granularity: 'Daily',
      forecasts: [
        {
          id: 'checking',
          forecast: forecast([
            ['2026-10-01', 12000],
            ['2026-10-03', 8000],
          ]),
        },
        {
          id: 'card',
          forecast: forecast([
            ['2026-10-01', -3000],
            ['2026-10-04', -5000],
          ]),
        },
      ],
    });
    expect(result.chartData).toEqual([
      { date: '2026-10-02', balance: 12000, series1: -3000 },
      { date: '2026-10-03', balance: 8000, series1: -3000 },
      { date: '2026-10-04', balance: 8000, series1: -5000 },
    ]);
    expect(result.lines.map(line => line.lowestPoint)).toEqual([
      { date: '2026-10-03', balance: 8000 },
      { date: '2026-10-04', balance: -5000 },
    ]);
  });

  it('shows combined account results from the engine without summing overlapping lines', () => {
    const result = buildForecastSeriesChart({
      series,
      start: '2026-10',
      end: '2026-11',
      granularity: 'Monthly',
      forecasts: [
        {
          id: 'checking',
          forecast: forecast([
            ['2026-10-31', 10000],
            ['2026-11-30', 6000],
          ]),
        },
        {
          id: 'card',
          forecast: forecast([
            ['2026-10-31', -4000],
            ['2026-11-30', 0],
          ]),
        },
        {
          id: 'both',
          forecast: forecast([
            ['2026-10-31', 10000, 'checking'],
            ['2026-10-31', -4000, 'card'],
            ['2026-11-30', 6000, 'checking'],
            ['2026-11-30', 0, 'card'],
          ]),
        },
      ],
    });
    expect(result.chartData).toEqual([
      { date: '2026-10', balance: 10000, series1: -4000, series2: 6000 },
      { date: '2026-11', balance: 6000, series1: 0, series2: 6000 },
    ]);
  });

  it('retains empty lines as no data and identifies names by id, including duplicate names', () => {
    const result = buildForecastSeriesChart({
      series: series.map(line => ({ ...line, name: 'Same name' })),
      start: '2026-10',
      end: '2026-10',
      granularity: 'Monthly',
      forecasts: [
        { id: 'card', forecast: forecast([]) },
        { id: 'checking', forecast: forecast([['2026-10-31', 10000]]) },
      ],
    });
    expect(
      result.lines.map(line => [line.id, line.name, line.endingPoint]),
    ).toEqual([
      ['card', 'Same name', undefined],
      ['checking', 'Same name', { date: '2026-10', balance: 10000 }],
    ]);
    expect(result.chartData).toEqual([{ date: '2026-10', series1: 10000 }]);
    expect(result.balances).toEqual([10000]);
  });
});
