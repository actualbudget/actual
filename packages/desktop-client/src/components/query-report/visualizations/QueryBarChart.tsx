import { theme } from '@actual-app/components/theme';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getColorScale } from '@desktop-client/components/reports/chart-theme';
import { assignColumns } from '@desktop-client/queries/columnRoles';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type BarConfig = {
  categoryColumn?: string;
  measureColumns?: string[];
  chartStyle: 'grouped' | 'stacked';
};

type QueryBarChartProps = {
  result: QueryResult;
  config: BarConfig;
  compact?: boolean;
};

export function QueryBarChart({
  result,
  config,
  compact = false,
}: QueryBarChartProps) {
  const assignment = assignColumns(result);
  // Prefer non-id dimensions for the default category so users don't
  // get a long foreign-key string as their x-axis label.
  const fallbackCategory = assignment.dimensionColumns.find(
    name => !assignment.idColumns.includes(name),
  );
  const categoryCol = config.categoryColumn ?? fallbackCategory;
  const measureCols = config.measureColumns ?? assignment.measureColumns;
  const colors = getColorScale('qualitative');

  if (!categoryCol) {
    return (
      <div style={{ padding: 20, color: theme.pageTextSubdued }}>
        At least one non-numeric column is needed for bar chart categories.
      </div>
    );
  }

  if (measureCols.length === 0) {
    return (
      <div style={{ padding: 20, color: theme.pageTextSubdued }}>
        Add at least one numeric column to use bar chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={compact ? 200 : 320}>
      <BarChart data={result.rows}>
        {!compact && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey={categoryCol}
          tick={{ fill: theme.pageText, fontSize: 12 }}
        />
        <YAxis tick={{ fill: theme.pageText, fontSize: 12 }} width={60} />
        {!compact && <Tooltip />}
        {measureCols.map((col, i) => (
          <Bar
            key={col}
            dataKey={col}
            fill={colors[i % colors.length]}
            stackId={config.chartStyle === 'stacked' ? 'stack' : undefined}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
