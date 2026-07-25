import * as monthUtils from '@actual-app/core/shared/months';
import type { ForecastResult } from '@actual-app/core/types/models/forecast';
import * as d from 'date-fns';

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
    const combinedBalanceByDate = getCombinedBalanceByDate(forecastData);

    // Expand month-shaped bounds to full months; keep day-shaped bounds exact.
    const startDay = monthUtils.isValidYearMonth(start)
      ? monthUtils.firstDayOfMonth(start)
      : start;
    const endDay = monthUtils.isValidYearMonth(end)
      ? monthUtils.lastDayOfMonth(end)
      : end;

    // Carry the balance forward from the latest point before the visible
    // range, so a day-shaped start doesn't begin the chart at zero.
    const priorDate = Object.keys(combinedBalanceByDate)
      .filter(date => date < startDay)
      .sort()
      .at(-1);
    let runningBalance =
      priorDate === undefined ? 0 : combinedBalanceByDate[priorDate];

    const startDate = monthUtils.parseDate(startDay);
    const endDate = monthUtils.parseDate(endDay);
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

  // Collapse day-level bounds to months so the month keys line up.
  const endMonth = monthUtils.getMonth(end);
  for (
    let month = monthUtils.getMonth(start);
    month <= endMonth;
    month = monthUtils.addMonths(month, 1)
  ) {
    if (combinedBalanceByMonth[month] !== undefined) {
      runningBalance = combinedBalanceByMonth[month];
    }

    result.push({ date: month, balance: runningBalance });
  }

  return result;
}

export function countForecastScheduledOccurrences({
  forecastData,
  start,
  end,
  granularity,
}: {
  forecastData: ForecastResult | null | undefined;
  start: string;
  end: string;
  granularity: Granularity;
}): number {
  if (!forecastData?.dataPoints.length) {
    return 0;
  }

  // The forecast query always covers whole months; only count occurrences the
  // chart actually shows. Daily keeps day-shaped bounds exact, Monthly widens
  // to full months (mirrors buildBalanceForecastChartData).
  const startDay =
    granularity === 'Daily' && !monthUtils.isValidYearMonth(start)
      ? start
      : monthUtils.firstDayOfMonth(start);
  const endDay =
    granularity === 'Daily' && !monthUtils.isValidYearMonth(end)
      ? end
      : monthUtils.lastDayOfMonth(end);

  const occurrenceKeys = new Set<string>();

  for (const dataPoint of forecastData.dataPoints) {
    if (dataPoint.date < startDay || dataPoint.date > endDay) {
      continue;
    }
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

export function getLowestChartDataPoint(chartData: ChartDataPoint[]) {
  return chartData.reduce<ChartDataPoint | undefined>((lowestPoint, point) => {
    if (!lowestPoint || point.balance < lowestPoint.balance) {
      return point;
    }

    return lowestPoint;
  }, undefined);
}
