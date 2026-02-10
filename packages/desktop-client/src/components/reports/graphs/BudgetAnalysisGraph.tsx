import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
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

import { FinancialText } from '@desktop-client/components/FinancialText';
import { Container } from '@desktop-client/components/reports/Container';
import { useFormat } from '@desktop-client/hooks/useFormat';
import type { FormatType } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

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
  overspendingAdjustment: number;
};

type PayloadItem = {
  payload: {
    date: string;
    budgeted: number;
    spent: number;
    balance: number;
    overspendingAdjustment: number;
  };
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

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  isConcise: boolean;
  format: (value: unknown, type?: FormatType) => string;
  showBalance: boolean;
};

function CustomTooltip({
  active,
  payload,
  isConcise,
  format,
  showBalance,
}: CustomTooltipProps) {
  const locale = useLocale();
  const { t } = useTranslation();

  if (!active || !payload || !Array.isArray(payload) || !payload[0]) {
    return null;
  }

  const [{ payload: data }] = payload;

  return (
    <div
      className={css({
        pointerEvents: 'none',
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      })}
    >
      <div>
        <div style={{ marginBottom: 10 }}>
          <strong>
            {monthUtils.format(
              data.date,
              isConcise ? 'MMMM yyyy' : 'MMMM dd, yyyy',
              locale,
            )}
          </strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          <AlignedText
            left={
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: theme.reportsNumberPositive,
                    display: 'inline-block',
                  }}
                />
                <Trans>Budgeted:</Trans>
              </span>
            }
            right={
              <FinancialText>
                {format(data.budgeted, 'financial')}
              </FinancialText>
            }
          />
          <AlignedText
            left={
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: theme.reportsNumberNegative,
                    display: 'inline-block',
                  }}
                />
                <Trans>Spent:</Trans>
              </span>
            }
            right={
              <FinancialText>{format(data.spent, 'financial')}</FinancialText>
            }
          />
          <AlignedText
            left={
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: theme.templateNumberUnderFunded,
                    display: 'inline-block',
                  }}
                />
                {t('Overspending Adjustment:')}
              </span>
            }
            right={
              <FinancialText>
                {format(data.overspendingAdjustment, 'financial')}
              </FinancialText>
            }
          />
          {showBalance && (
            <AlignedText
              left={
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: theme.reportsGray,
                      display: 'inline-block',
                    }}
                  />
                  <Trans>Balance:</Trans>
                </span>
              }
              right={
                <FinancialText>
                  <strong>{format(data.balance, 'financial')}</strong>
                </FinancialText>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

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
  const privacyMode = usePrivacyMode();
  const [yAxisIsHovered, setYAxisIsHovered] = useState(false);

  // Centralize translated labels to avoid repetition
  const budgetedLabel = t('Budgeted');
  const spentLabel = t('Spent');
  const balanceLabel = t('Balance');
  const overspendingLabel = t('Overspending Adjustment');

  const graphData = data.intervalData;

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
              tick={{ fill: theme.reportsLabel }}
              tickFormatter={formatDate}
              minTickGap={50}
            />
            <YAxis
              tick={{ fill: theme.reportsLabel }}
              tickCount={8}
              tickFormatter={value =>
                privacyMode && !yAxisIsHovered
                  ? '...'
                  : format(value, 'financial-no-decimals')
              }
              onMouseEnter={() => setYAxisIsHovered(true)}
              onMouseLeave={() => setYAxisIsHovered(false)}
              stroke={theme.pageTextSubdued}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={
                <CustomTooltip
                  isConcise={isConcise}
                  format={format}
                  showBalance={showBalance}
                />
              }
              isAnimationActive={false}
            />
            <Bar
              dataKey="budgeted"
              fill={theme.reportsNumberPositive}
              name={budgetedLabel}
              animationDuration={1000}
            />
            <Bar
              dataKey="spent"
              fill={theme.reportsNumberNegative}
              name={spentLabel}
              animationDuration={1000}
            />
            <Bar
              dataKey="overspendingAdjustment"
              fill={theme.templateNumberUnderFunded}
              name={overspendingLabel}
              animationDuration={1000}
            />
            {showBalance && (
              <Line
                type="monotone"
                dataKey="balance"
                stroke={theme.reportsGray}
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
              tick={{ fill: theme.reportsLabel }}
              tickFormatter={formatDate}
              minTickGap={50}
            />
            <YAxis
              tick={{ fill: theme.reportsLabel }}
              tickCount={8}
              tickFormatter={value =>
                privacyMode && !yAxisIsHovered
                  ? '...'
                  : format(value, 'financial-no-decimals')
              }
              onMouseEnter={() => setYAxisIsHovered(true)}
              onMouseLeave={() => setYAxisIsHovered(false)}
              stroke={theme.pageTextSubdued}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={
                <CustomTooltip
                  isConcise={isConcise}
                  format={format}
                  showBalance={showBalance}
                />
              }
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="budgeted"
              stroke={theme.reportsNumberPositive}
              strokeWidth={2}
              name={budgetedLabel}
              dot={false}
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="spent"
              stroke={theme.reportsNumberNegative}
              strokeWidth={2}
              name={spentLabel}
              dot={false}
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="overspendingAdjustment"
              stroke={theme.templateNumberUnderFunded}
              strokeWidth={2}
              name={overspendingLabel}
              dot={false}
              animationDuration={1000}
            />
            {showBalance && (
              <Line
                type="monotone"
                dataKey="balance"
                stroke={theme.reportsGray}
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
