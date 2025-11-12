import React, { type CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
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

type BudgetAnalysisIntervalData = {
  date: string;
  budgeted: number;
  spent: number;
  balance: number;
};

type BudgetAnalysisGraphProps = {
  style?: CSSProperties;
  data: {
    intervalData: BudgetAnalysisIntervalData[];
  };
  compact?: boolean;
  graphType?: 'Line' | 'Bar';
  interval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  showBalance?: boolean;
};

export function BudgetAnalysisGraph({
  style,
  data,
  compact,
  graphType = 'Line',
  interval = 'Monthly',
  showBalance = true,
}: BudgetAnalysisGraphProps) {
  const format = useFormat();
  const locale = useLocale();

  const graphData = data.intervalData.map(item => ({
    date: item.date,
    budgeted: item.budgeted,
    spent: item.spent,
    balance: item.balance,
  }));

  const formatDate = (date: string) => {
    if (interval === 'Yearly') {
      return date;
    } else if (interval === 'Weekly') {
      return monthUtils.format(date, 'MMM d', locale);
    } else if (interval === 'Daily') {
      return monthUtils.format(date, 'MMM d', locale);
    }
    return monthUtils.format(date, 'MMM', locale);
  };

  const commonProps = {
    width: 0,
    height: 0,
    data: graphData,
    margin: { top: 5, right: 5, left: 5, bottom: 5 },
  };

  return (
    <Container style={style}>
      {(width, height) => {
        const chartProps = { ...commonProps, width, height };

        return graphData && graphType === 'Bar' ? (
          <ComposedChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.pillBorder} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
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
            <Bar
              dataKey="budgeted"
              fill={theme.reportsGreen}
              name="Budgeted"
              animationDuration={1000}
            />
            <Bar
              dataKey="spent"
              fill={theme.reportsRed}
              name="Spent"
              animationDuration={1000}
            />
            {showBalance && (
              <Line
                type="monotone"
                dataKey="balance"
                stroke={theme.reportsBlue}
                strokeWidth={2}
                name="Balance"
                dot={!compact}
                animationDuration={1000}
              />
            )}
          </ComposedChart>
        ) : (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.pillBorder} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
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
            {showBalance && (
              <Line
                type="monotone"
                dataKey="balance"
                stroke={theme.reportsBlue}
                strokeWidth={2}
                name="Balance"
                dot={!compact}
                animationDuration={1000}
              />
            )}
          </LineChart>
        );
      }}
    </Container>
  );
}

