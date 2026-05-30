import * as monthUtils from '@actual-app/core/shared/months';
import * as d from 'date-fns';
import type { ForecastResult } from '@actual-app/core/types/models/forecast';

type Granularity = 'Daily' | 'Monthly';
type ChartDataPoint = { date: string; balance: number };

function getCombinedBalanceByDate(forecastData: ForecastResult) {
  const balancesByDateAndAccount: Record<string, Record<string, number>> = {};

  for (const dataPoint of forecastData.dataPoints) {
    if (!balancesByDateAndAccount[dataPoint.date]) {
      balancesByDateAndAccount[dataPoint.date] = {};
    }

    balancesByDateAndAccount[dataPoint.date][dataPoint.accountId] =
      dataPoint.balance;
  }

  const combinedBalanceByDate: Record<string, number> = {};
  for (const [date, balancesByAccount] of Object.entries(
    balancesByDateAndAccount,
  )) {
    combinedBalanceByDate[date] = Object.values(balancesByAccount).reduce(
      (sum, balance) => sum + balance,
      0,
    );
  }

  return combinedBalanceByDate;
}

function getCombinedBalanceByMonth(forecastData: ForecastResult) {
  const balancesByMonthAndAccount: Record<string, Record<string, number>> = {};

  for (const dataPoint of forecastData.dataPoints) {
    const month = dataPoint.date.substring(0, 7);

    if (!balancesByMonthAndAccount[month]) {
      balancesByMonthAndAccount[month] = {};
    }

    balancesByMonthAndAccount[month][dataPoint.accountId] = dataPoint.balance;
  }

  const combinedBalanceByMonth: Record<string, number> = {};
  for (const [month, balancesByAccount] of Object.entries(
    balancesByMonthAndAccount,
  )) {
    combinedBalanceByMonth[month] = Object.values(balancesByAccount).reduce(
      (sum, balance) => sum + balance,
      0,
    );
  }

  return combinedBalanceByMonth;
}

export function buildBalanceForecastChartData({
  forecastData,
  start,
  end,
  granularity,
}: {
  forecastData: ForecastResult | null;
  start: string;
  end: string;
  granularity: Granularity;
}) {
  if (!forecastData || forecastData.dataPoints.length === 0) {
    return [];
  }

  if (granularity === 'Daily') {
    const result: ChartDataPoint[] = [];
    let runningBalance = 0;
    const combinedBalanceByDate = getCombinedBalanceByDate(forecastData);

    const startDate = monthUtils.parseDate(start + '-01');
    const endDate = monthUtils.parseDate(monthUtils.lastDayOfMonth(end));
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayStr = d.format(current, 'yyyy-MM-dd');
      if (combinedBalanceByDate[dayStr] !== undefined) {
        runningBalance = combinedBalanceByDate[dayStr];
      }
      result.push({ date: dayStr, balance: runningBalance });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  const result: ChartDataPoint[] = [];
  let runningBalance = 0;
  const combinedBalanceByMonth = getCombinedBalanceByMonth(forecastData);

  for (
    let month = start;
    month <= end;
    month = monthUtils.addMonths(month, 1)
  ) {
    if (combinedBalanceByMonth[month] !== undefined) {
      runningBalance = combinedBalanceByMonth[month];
    }

    result.push({ date: month, balance: runningBalance });
  }

  return result;
}

export function countForecastScheduledOccurrences(
  forecastData: ForecastResult | null | undefined,
): number {
  if (!forecastData?.dataPoints.length) {
    return 0;
  }

  const occurrenceKeys = new Set<string>();

  for (const dataPoint of forecastData.dataPoints) {
    for (const transaction of dataPoint.transactions) {
      occurrenceKeys.add(`${dataPoint.date}:${transaction.scheduleId}`);
    }
  }

  return occurrenceKeys.size;
}

export function getZeroCrossingGradientOffset(chartData: ChartDataPoint[]) {
  if (chartData.length === 0) {
    return null;
  }

  const balances = chartData.map(point => point.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);

  if (minBalance >= 0 || maxBalance <= 0) {
    return null;
  }

  return (maxBalance / (maxBalance - minBalance)) * 100;
}
