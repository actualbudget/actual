import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import type { BudgetType } from '@actual-app/core/server/prefs';
import * as monthUtils from '@actual-app/core/shared/months';
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

import { FinancialText } from '#components/FinancialText';
import { Container } from '#components/reports/Container';
import type { BudgetAnalysisIntervalData } from '#components/reports/spreadsheets/budget-analysis-spreadsheet';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

import { SeriesLabel } from './SeriesLabel';
import { computePadding } from './util/computePadding';

type PayloadItem = {
  payload: BudgetAnalysisIntervalData;
};

type BudgetAnalysisGraphProps = {
  style?: CSSProperties;
  data: {
    budgetType: BudgetType;
    intervalData: BudgetAnalysisIntervalData[];
  };
  graphType?: 'Line' | 'Bar';
  showBalance?: boolean;
  balanceOnly?: boolean;
  showCumulativeVariance?: boolean;
  isConcise?: boolean;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  isConcise: boolean;
  format: (value: unknown, type?: FormatType) => string;
  showBalance: boolean;
  balanceOnly: boolean;
  isTracking: boolean;
  showCumulativeVariance: boolean;
};

function CustomTooltip({
  active,
  payload,
  isConcise,
  format,
  showBalance,
  balanceOnly,
  isTracking,
  showCumulativeVariance,
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
          {!balanceOnly && (
            <AlignedText
              left={
                <SeriesLabel color={theme.reportsNumberPositive}>
                  <Trans>Budgeted:</Trans>
                </SeriesLabel>
              }
              right={
                <FinancialText>
                  {format(data.budgeted, 'financial')}
                </FinancialText>
              }
            />
          )}
          {!balanceOnly && (
            <AlignedText
              left={
                <SeriesLabel color={theme.reportsNumberNegative}>
                  <Trans>Spent:</Trans>
                </SeriesLabel>
              }
              right={
                <FinancialText>{format(data.spent, 'financial')}</FinancialText>
              }
            />
          )}
          {!balanceOnly && !isTracking && (
            <AlignedText
              left={
                <SeriesLabel color={theme.templateNumberUnderFunded}>
                  {t('Overspending Adjustment:')}
                </SeriesLabel>
              }
              right={
                <FinancialText>
                  {format(data.overspendingAdjustment, 'financial')}
                </FinancialText>
              }
            />
          )}
          {(showBalance || balanceOnly) && (
            <AlignedText
              left={
                <SeriesLabel color={theme.reportsGray}>
                  <Trans>Balance:</Trans>
                </SeriesLabel>
              }
              right={
                <FinancialText>
                  <strong>{format(data.balance, 'financial')}</strong>
                </FinancialText>
              }
            />
          )}
          {isTracking && (
            <AlignedText
              left={<Trans>Variance:</Trans>}
              right={
                <FinancialText>
                  {format(data.variance, 'financial')}
                </FinancialText>
              }
            />
          )}
          {showCumulativeVariance && (
            <AlignedText
              left={
                <SeriesLabel color={theme.reportsBlue}>
                  <Trans>Cumulative Variance:</Trans>
                </SeriesLabel>
              }
              right={
                <FinancialText>
                  <strong>
                    {format(data.cumulativeVariance, 'financial')}
                  </strong>
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
  balanceOnly = false,
  showCumulativeVariance = true,
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
  const cumulativeVarianceLabel = t('Cumulative Variance');

  // Tracking budgets have no overspending adjustment, and variance is how they
  // measure performance against the plan.
  const isTracking = data.budgetType === 'tracking';
  const drawCumulativeVariance = isTracking && showCumulativeVariance;

  const graphData = data.intervalData;

  const formatDate = (date: string) => {
    if (isConcise) {
      // Monthly format
      return monthUtils.format(date, 'MMM', locale);
    }
    // Daily format
    return monthUtils.format(date, 'MMM d', locale);
  };

  const allValues = graphData.flatMap(item => [
    item.budgeted,
    item.spent,
    item.balance,
    item.overspendingAdjustment,
    ...(drawCumulativeVariance ? [item.cumulativeVariance] : []),
  ]);

  const leftPadding = computePadding(allValues, value =>
    format(value, 'financial-no-decimals'),
  );

  const commonProps = {
    width: 0,
    height: 0,
    data: graphData,
    margin: { top: 5, right: 5, left: 5 + leftPadding, bottom: 5 },
  };

  return (
    <Container style={style}>
      {(width, height) => {
        const chartProps = { ...commonProps, width, height };

        const sharedAxes = (
          <>
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
                  balanceOnly={balanceOnly}
                  isTracking={isTracking}
                  showCumulativeVariance={drawCumulativeVariance}
                />
              }
              isAnimationActive={false}
            />
          </>
        );

        const cumulativeVarianceLine = drawCumulativeVariance && (
          <Line
            type="monotone"
            dataKey="cumulativeVariance"
            stroke={theme.reportsBlue}
            strokeWidth={2}
            name={cumulativeVarianceLabel}
            dot={false}
            animationDuration={1000}
          />
        );

        return graphType === 'Bar' && !balanceOnly ? (
          <ComposedChart {...chartProps}>
            {sharedAxes}
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
            {!isTracking && (
              <Bar
                dataKey="overspendingAdjustment"
                fill={theme.templateNumberUnderFunded}
                name={overspendingLabel}
                animationDuration={1000}
              />
            )}
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
            {cumulativeVarianceLine}
          </ComposedChart>
        ) : (
          <LineChart {...chartProps}>
            {sharedAxes}
            {!balanceOnly && (
              <Line
                type="monotone"
                dataKey="budgeted"
                stroke={theme.reportsNumberPositive}
                strokeWidth={2}
                name={budgetedLabel}
                dot={false}
                animationDuration={1000}
              />
            )}
            {!balanceOnly && (
              <Line
                type="monotone"
                dataKey="spent"
                stroke={theme.reportsNumberNegative}
                strokeWidth={2}
                name={spentLabel}
                dot={false}
                animationDuration={1000}
              />
            )}
            {!balanceOnly && !isTracking && (
              <Line
                type="monotone"
                dataKey="overspendingAdjustment"
                stroke={theme.templateNumberUnderFunded}
                strokeWidth={2}
                name={overspendingLabel}
                dot={false}
                animationDuration={1000}
              />
            )}
            {(showBalance || balanceOnly) && (
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
            {cumulativeVarianceLine}
          </LineChart>
        );
      }}
    </Container>
  );
}
