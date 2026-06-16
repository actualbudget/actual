import { theme } from '@actual-app/components/theme';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { getColorScale } from '@desktop-client/components/reports/chart-theme';
import { assignColumns } from '@desktop-client/queries/columnRoles';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type DonutConfig = {
  categoryColumn?: string;
  measureColumn?: string;
};

type QueryDonutProps = {
  result: QueryResult;
  config: DonutConfig;
  compact?: boolean;
};

export function QueryDonut({
  result,
  config,
  compact = false,
}: QueryDonutProps) {
  const assignment = assignColumns(result);
  const fallbackCategory = assignment.dimensionColumns.find(
    name => !assignment.idColumns.includes(name),
  );
  const categoryCol = config.categoryColumn ?? fallbackCategory;
  const measureCol = config.measureColumn ?? assignment.measureColumns[0];
  const colors = getColorScale('qualitative');

  if (!categoryCol || !measureCol) {
    return (
      <div style={{ padding: 20, color: theme.pageTextSubdued }}>
        Select a category column and a numeric measure column for the donut.
      </div>
    );
  }

  const data = result.rows.map(row => ({
    name: String(row[categoryCol] ?? ''),
    value: Number(row[measureCol]) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={compact ? 200 : 320}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={compact ? 40 : 60}
          outerRadius={compact ? 60 : 80}
          isAnimationActive={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        {!compact && <Tooltip />}
      </PieChart>
    </ResponsiveContainer>
  );
}
