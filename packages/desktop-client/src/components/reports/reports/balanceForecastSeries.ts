import type {
  ForecastResult,
  ForecastSeries,
} from '@actual-app/core/types/models/forecast';

import {
  buildBalanceForecastChartData,
  getLowestChartDataPoint,
} from './balanceForecastChartData';

export const MAX_FORECAST_SERIES = 4;

export function buildForecastSeriesChart({
  forecasts,
  series,
  start,
  end,
  granularity,
}: {
  forecasts: Array<{ id: string; forecast: ForecastResult }> | undefined;
  series?: ForecastSeries[];
  start: string;
  end: string;
  granularity: 'Daily' | 'Monthly';
}) {
  const lines = (forecasts ?? []).map(({ id, forecast }, index) => {
    const options = { forecastData: forecast, start, end, granularity };
    const points = buildBalanceForecastChartData(options);
    return {
      id,
      name: series?.find(line => line.id === id)?.name ?? '',
      dataKey: index === 0 ? 'balance' : `series${index}`,
      points,
      endingPoint: points.at(-1),
      lowestPoint: getLowestChartDataPoint(points),
    };
  });

  // Align by date, not array position. An empty series stays absent instead
  // of drawing a zero balance or borrowing another series' values.
  const pointsByDate = new Map<
    string,
    { date: string; [key: string]: string | number }
  >();
  for (const line of lines) {
    for (const point of line.points) {
      const row = pointsByDate.get(point.date) ?? { date: point.date };
      row[line.dataKey] = point.balance;
      pointsByDate.set(point.date, row);
    }
  }

  return {
    lines,
    chartData: [...pointsByDate.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    balances: lines.flatMap(line => line.points.map(point => point.balance)),
  };
}

export type ForecastChartLine = ReturnType<
  typeof buildForecastSeriesChart
>['lines'][number];
