import { useTranslation } from 'react-i18next';

import { type CSSProperties } from '@actual-app/components/styles';
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

/**
 * Interval data for the Budget Analysis graph.
 * @property date - A date string in format 'YYYY-MM' for monthly intervals
 *                  or 'YYYY-MM-DD' for daily intervals, compatible with monthUtils.format
 */
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
  graphType?: 'Line' | 'Bar';
  showBalance?: boolean;
  isConcise?: boolean;
};

export function BudgetAnalysisGraph({
  style,
  data,
  graphType = 'Line',
  showBalance = true,
  isConcise = true,
}: BudgetAnalysisGraphProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();

  // Centralize translated labels to avoid repetition
  const budgetedLabel = t('Budgeted');
  const spentLabel = t('Spent');
  const balanceLabel = t('Balance');

  const graphData = data.intervalData;

  const tooltipContentStyle = {
    pointerEvents: 'none' as const,
    zIndex: 1000,
    borderRadius: 2,
    boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
    color: theme.menuItemText,
    backgroundColor: theme.menuBackground,
  };

  const formatDate = (date: string) => {
    if (isConcise) {
      // Monthly format
      return monthUtils.format(date, 'MMM', locale);
    }
    // Daily format
    return monthUtils.format(date, 'MMM d', locale);
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

        return graphType === 'Bar' ? (
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
              contentStyle={tooltipContentStyle}
              isAnimationActive={false}
            />
            <Bar
              dataKey="budgeted"
              fill={theme.reportsBlue}
              name={budgetedLabel}
              animationDuration={1000}
            />
            <Bar
              dataKey="spent"
              fill={theme.reportsRed}
              name={spentLabel}
              animationDuration={1000}
            />
            {showBalance && (
              <Line
                type="monotone"
                dataKey="balance"
                stroke={theme.pageTextLight}
                strokeWidth={2}
                name={balanceLabel}
                dot={false}
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
              contentStyle={tooltipContentStyle}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="budgeted"
              stroke={theme.reportsBlue}
              strokeWidth={2}
              name={budgetedLabel}
              dot={false}
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="spent"
              stroke={theme.reportsRed}
              strokeWidth={2}
              name={spentLabel}
              dot={false}
              animationDuration={1000}
            />
            {showBalance && (
              <Line
                type="monotone"
                dataKey="balance"
                stroke={theme.pageTextLight}
                strokeWidth={2}
                name={balanceLabel}
                dot={false}
                animationDuration={1000}
              />
            )}
          </LineChart>
        );
      }}
    </Container>
  );
}
