import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import * as d from 'date-fns';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

const MAX_BAR_SIZE = 50;
const ANIMATION_DURATION = 1000; // in ms
const PROJECTED_OPACITY = 0.4;

type DataItem = {
  date: Date;
  income: number;
  expenses: number;
  balance: number | null;
  projectedBalance: number | null;
  transfers: number;
  projected: boolean;
};

type PayloadItem = {
  payload: DataItem;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  isConcise: boolean;
  format: (value: unknown, type?: FormatType) => string;
};

function CustomTooltip({
  active,
  payload,
  isConcise,
  format,
}: CustomTooltipProps) {
  const locale = useLocale();
  const { t } = useTranslation();

  if (!active || !payload || !Array.isArray(payload) || !payload[0]) {
    return null;
  }

  const [{ payload: data }] = payload;
  const balance = data.projected ? data.projectedBalance : data.balance;

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
            {d.format(data.date, isConcise ? 'MMMM yyyy' : 'MMMM dd, yyyy', {
              locale,
            })}
            {data.projected && (
              <span style={{ color: theme.pageTextLight, marginLeft: 6 }}>
                ({t('projected')})
              </span>
            )}
          </strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          <AlignedText
            left={t('Income:')}
            right={
              <FinancialText>{format(data.income, 'financial')}</FinancialText>
            }
          />
          <AlignedText
            left={t('Expenses:')}
            right={
              <FinancialText>
                {format(data.expenses, 'financial')}
              </FinancialText>
            }
          />
          <AlignedText
            left={t('Change:')}
            right={
              <FinancialText as="strong">
                {format(data.income + data.expenses, 'financial')}
              </FinancialText>
            }
          />
          {data.transfers !== 0 && (
            <AlignedText
              left={t('Transfers:')}
              right={
                <FinancialText>
                  {format(data.transfers, 'financial')}
                </FinancialText>
              }
            />
          )}
          {balance != null && (
            <AlignedText
              left={t('Balance:')}
              right={
                <FinancialText>{format(balance, 'financial')}</FinancialText>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

type CashFlowGraphProps = {
  graphData: {
    expenses: { x: Date; y: number; projected?: boolean }[];
    income: { x: Date; y: number; projected?: boolean }[];
    balances: { x: Date; y: number; projected?: boolean }[];
    transfers: { x: Date; y: number; projected?: boolean }[];
  };
  isConcise: boolean;
  showBalance?: boolean;
  style?: CSSProperties;
};
export function CashFlowGraph({
  graphData,
  isConcise,
  showBalance = true,
  style,
}: CashFlowGraphProps) {
  const locale = useLocale();
  const privacyMode = usePrivacyMode();
  const [yAxisIsHovered, setYAxisIsHovered] = useState(false);
  const format = useFormat();
  const animationProps = useRechartsAnimation({
    animationDuration: ANIMATION_DURATION,
  });

  const firstProjectedIdx = graphData.expenses.findIndex(
    row => row.projected === true,
  );
  const hasProjected = firstProjectedIdx !== -1;

  const data: DataItem[] = graphData.expenses.map((row, idx) => {
    const projected = row.projected === true;
    const isLastActual =
      hasProjected && !projected && idx === firstProjectedIdx - 1;

    return {
      date: row.x,
      expenses: row.y,
      income: graphData.income[idx].y,
      balance: projected ? null : graphData.balances[idx].y,
      projectedBalance:
        projected || isLastActual ? graphData.balances[idx].y : null,
      transfers: graphData.transfers[idx].y,
      projected,
    };
  });

  return (
    <Container style={style}>
      {(width, height) => (
        <ComposedChart
          responsive
          width={width}
          height={height}
          stackOffset="sign"
          data={data}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: theme.reportsLabel }}
            tickFormatter={x => {
              return d.format(x, isConcise ? "MMM ''yy" : 'MMM d', {
                locale,
              });
            }}
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
          />
          <Tooltip
            labelFormatter={x => {
              return d.format(x, isConcise ? "MMM ''yy" : 'MMM d', {
                locale,
              });
            }}
            content={<CustomTooltip isConcise={isConcise} format={format} />}
            isAnimationActive={false}
          />

          <ReferenceLine y={0} stroke="#000" />
          <Bar
            dataKey="income"
            stackId="a"
            maxBarSize={MAX_BAR_SIZE}
            {...animationProps}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={theme.reportsNumberPositive}
                fillOpacity={entry.projected ? PROJECTED_OPACITY : 1}
              />
            ))}
          </Bar>
          <Bar
            dataKey="expenses"
            stackId="a"
            maxBarSize={MAX_BAR_SIZE}
            {...animationProps}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={theme.reportsNumberNegative}
                fillOpacity={entry.projected ? PROJECTED_OPACITY : 1}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="balance"
            dot={false}
            hide={!showBalance}
            stroke={theme.pageTextLight}
            strokeWidth={2}
            connectNulls={false}
            {...animationProps}
          />
          {hasProjected && (
            <Line
              type="monotone"
              dataKey="projectedBalance"
              dot={false}
              hide={!showBalance}
              stroke={theme.pageTextLight}
              strokeWidth={2}
              strokeDasharray="6 3"
              connectNulls={false}
              {...animationProps}
            />
          )}
        </ComposedChart>
      )}
    </Container>
  );
}
