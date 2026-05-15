import { describe, expect, it } from 'vitest';

import {
  buildBalanceForecastChartData,
  countForecastScheduledOccurrences,
} from './balanceForecastChartData';

describe('buildBalanceForecastChartData', () => {
  it('combines balances across accounts for monthly data', () => {
    const chartData = buildBalanceForecastChartData({
      forecastData: {
        dataPoints: [
          {
            date: '2024-03-01',
            balance: 1000,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
          {
            date: '2024-03-01',
            balance: 500,
            accountId: 'savings',
            accountName: 'Savings',
            transactions: [],
          },
          {
            date: '2024-04-01',
            balance: 900,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
          {
            date: '2024-04-01',
            balance: 700,
            accountId: 'savings',
            accountName: 'Savings',
            transactions: [],
          },
        ],
        lowestBalance: {
          date: '2024-03-01',
          balance: 1500,
          accountId: '',
          accountName: '',
        },
        forecastStartDate: '2024-03-01',
        forecastEndDate: '2024-04-30',
      },
      start: '2024-03',
      end: '2024-04',
      granularity: 'Monthly',
    });

    expect(chartData).toEqual([
      { date: '2024-03', balance: 1500 },
      { date: '2024-04', balance: 1600 },
    ]);
  });

  it('carries monthly balances through the full end month for daily data', () => {
    const chartData = buildBalanceForecastChartData({
      forecastData: {
        dataPoints: [
          {
            date: '2024-03-01',
            balance: 1000,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
          {
            date: '2024-04-01',
            balance: 1200,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
        ],
        lowestBalance: {
          date: '2024-03-01',
          balance: 1000,
          accountId: '',
          accountName: '',
        },
        forecastStartDate: '2024-03-01',
        forecastEndDate: '2024-04-30',
      },
      start: '2024-03',
      end: '2024-04',
      granularity: 'Daily',
    });

    expect(chartData[0]).toEqual({ date: '2024-03-01', balance: 1000 });
    expect(chartData[30]).toEqual({ date: '2024-03-31', balance: 1000 });
    expect(chartData[31]).toEqual({ date: '2024-04-01', balance: 1200 });
    expect(chartData.at(-1)).toEqual({ date: '2024-04-30', balance: 1200 });
    expect(chartData).toHaveLength(61);
  });

  it('uses the latest same-day balance for each account', () => {
    const chartData = buildBalanceForecastChartData({
      forecastData: {
        dataPoints: [
          {
            date: '2024-03-01',
            balance: 1000,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
          {
            date: '2024-03-01',
            balance: 850,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
          {
            date: '2024-03-01',
            balance: 500,
            accountId: 'savings',
            accountName: 'Savings',
            transactions: [],
          },
        ],
        lowestBalance: {
          date: '2024-03-01',
          balance: 1350,
          accountId: '',
          accountName: '',
        },
        forecastStartDate: '2024-03-01',
        forecastEndDate: '2024-03-31',
      },
      start: '2024-03',
      end: '2024-03',
      granularity: 'Daily',
    });

    expect(chartData[0]).toEqual({ date: '2024-03-01', balance: 1350 });
    expect(chartData.at(-1)).toEqual({ date: '2024-03-31', balance: 1350 });
  });

  it('uses the latest balance in each month for monthly data', () => {
    const chartData = buildBalanceForecastChartData({
      forecastData: {
        dataPoints: [
          {
            date: '2024-03-01',
            balance: 1000,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
          {
            date: '2024-03-31',
            balance: 900,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
          {
            date: '2024-04-01',
            balance: 950,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
          {
            date: '2024-04-30',
            balance: 1100,
            accountId: 'checking',
            accountName: 'Checking',
            transactions: [],
          },
        ],
        lowestBalance: {
          date: '2024-03-31',
          balance: 900,
          accountId: '',
          accountName: '',
        },
        forecastStartDate: '2024-03-01',
        forecastEndDate: '2024-04-30',
      },
      start: '2024-03',
      end: '2024-04',
      granularity: 'Monthly',
    });

    expect(chartData).toEqual([
      { date: '2024-03', balance: 900 },
      { date: '2024-04', balance: 1100 },
    ]);
  });
});

describe('countForecastScheduledOccurrences', () => {
  it('counts a transfer schedule once across both account legs', () => {
    const count = countForecastScheduledOccurrences({
      dataPoints: [
        {
          date: '2024-03-20',
          balance: -250,
          accountId: 'checking',
          accountName: 'Checking',
          transactions: [
            {
              amount: -250,
              payee: 'Transfer to savings',
              scheduleId: 'schedule-transfer',
              scheduleName: 'Transfer to savings',
            },
          ],
        },
        {
          date: '2024-03-20',
          balance: 250,
          accountId: 'savings',
          accountName: 'Savings',
          transactions: [
            {
              amount: 250,
              payee: 'Transfer from checking',
              scheduleId: 'schedule-transfer',
              scheduleName: 'Transfer to savings',
            },
          ],
        },
        {
          date: '2024-04-20',
          balance: 0,
          accountId: 'checking',
          accountName: 'Checking',
          transactions: [
            {
              amount: -250,
              payee: 'Transfer to savings',
              scheduleId: 'schedule-transfer',
              scheduleName: 'Transfer to savings',
            },
          ],
        },
      ],
      lowestBalance: {
        date: '2024-03-20',
        balance: 0,
        accountId: '',
        accountName: '',
      },
      forecastStartDate: '2024-03-01',
      forecastEndDate: '2024-04-30',
    });

    expect(count).toBe(2);
  });
});
