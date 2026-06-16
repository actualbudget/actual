import { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import * as monthUtils from 'loot-core/shared/months';

import { assignColumns } from '@desktop-client/queries/columnRoles';
import type {
  QueryResult,
  QueryResultColumn,
} from '@desktop-client/queries/processQueryResult';

type TimeSeriesConfig = {
  timeColumn?: string;
  measureColumns?: string[];
  chartStyle: 'line' | 'area';
};

type QueryTimeSeriesProps = {
  result: QueryResult;
  config: TimeSeriesConfig;
  compact?: boolean;
};

function formatTick(
  value: unknown,
  col: QueryResultColumn | undefined,
): string {
  if (value === null || value === undefined) return '';
  if (!col) return String(value);

  switch (col.type) {
    case 'date':
      return monthUtils.format(String(value), 'MM/dd/yyyy');
    case 'date-month':
      return monthUtils.format(String(value), 'MMM yyyy');
    case 'date-year':
      return String(value);
    default:
      return String(value);
  }
}

export function QueryTimeSeries({
  result,
  config,
  compact = false,
}: QueryTimeSeriesProps) {
  const assignment = assignColumns(result);
  const timeCol = config.timeColumn ?? assignment.timeColumns[0] ?? '__index__';
  const measureCols = config.measureColumns ?? assignment.measureColumns;

  // The series-key resolution: when the user hasn't picked a time
  // column we fall back to the row index so the chart still has
  // an x-axis.
  const xAxisKey = timeCol;
  const data = useMemo(() => {
    if (timeCol !== '__index__') return result.rows;
    return result.rows.map((r, i) => ({ ...r, __index__: i }));
  }, [result.rows, timeCol]);

  const timeColDef = result.columns.find(c => c.name === timeCol);
  const tickFormatter = (value: unknown) => formatTick(value, timeColDef);

  const ChartComponent = config.chartStyle === 'area' ? AreaChart : LineChart;
  const SeriesComponent = config.chartStyle === 'area' ? Area : Line;

  if (measureCols.length === 0) {
    return (
      <div style={{ padding: 20, color: theme.pageTextSubdued }}>
        Add at least one numeric column (e.g.{' '}
        <code>{'{ total: { $sum: ... } }'}</code>) to use time-series.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={compact ? 200 : 320}>
      <ChartComponent data={data}>
        {!compact && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey={xAxisKey}
          tickFormatter={tickFormatter}
          tick={{ fill: theme.pageText, fontSize: 12 }}
        />
        <YAxis tick={{ fill: theme.pageText, fontSize: 12 }} width={60} />
        {!compact && <Tooltip />}
        {measureCols.map((col, i) => (
          <SeriesComponent
            key={col}
            type="monotone"
            dataKey={col}
            stroke={
              [theme.reportsBlue, theme.reportsGreen, theme.reportsRed][i % 3]
            }
            fill={
              config.chartStyle === 'area' ? theme.reportsChartFill : undefined
            }
            isAnimationActive={false}
          />
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  );
}
