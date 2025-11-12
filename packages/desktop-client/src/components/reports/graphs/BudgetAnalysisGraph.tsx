import React, { type CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import * as monthUtils from 'loot-core/shared/months';

import { Container } from '@desktop-client/components/reports/Container';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';

type BudgetAnalysisMonthData = {
  month: string;
  budgeted: number;
  spent: number;
  balance: number;
};

type BudgetAnalysisGraphProps = {
  style?: CSSProperties;
  data: {
    monthData: BudgetAnalysisMonthData[];
  };
  compact?: boolean;
};

export function BudgetAnalysisGraph({
  style,
  data,
  compact,
}: BudgetAnalysisGraphProps) {
  const format = useFormat();
  const locale = useLocale();

  const graphData = data.monthData.map(month => ({
    month: month.month,
    budgeted: month.budgeted,
    spent: month.spent,
    balance: month.balance,
  }));

  return (
    <Container style={style}>
      {(width, height) =>
        graphData && (
          <LineChart
            width={width}
            height={height}
            data={graphData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.pillBorder} />
            <XAxis
              dataKey="month"
              tickFormatter={(month: string) => {
                return monthUtils.format(month, 'MMM', locale);
              }}
              stroke={theme.pageTextSubdued}
            />
            <YAxis
              tickFormatter={value => format(value, 'financial')}
              stroke={theme.pageTextSubdued}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              formatter={(value: number) => format(value, 'financial')}
              contentStyle={{
                pointerEvents: 'none',
                zIndex: 1000,
                borderRadius: 2,
                boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
                color: theme.menuItemText,
                backgroundColor: theme.menuBackground,
              }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="budgeted"
              stroke={theme.reportsGreen}
              strokeWidth={2}
              name="Budgeted"
              dot={!compact}
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="spent"
              stroke={theme.reportsRed}
              strokeWidth={2}
              name="Spent"
              dot={!compact}
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={theme.reportsBlue}
              strokeWidth={2}
              name="Balance"
              dot={!compact}
              animationDuration={1000}
            />
          </LineChart>
        )
      }
    </Container>
  );
}
