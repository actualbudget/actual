import React, { useState } from 'react';

import * as d from 'date-fns';
import { css } from 'glamor';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';

import {
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from 'loot-core/src/shared/util';

import { usePrivacyMode } from '../../../hooks/usePrivacyMode';
import { theme } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Text } from '../../common/Text';
import { PrivacyFilter } from '../../PrivacyFilter';
import { chartTheme } from '../chart-theme';

const MAX_BAR_SIZE = 50;
const ANIMATION_DURATION = 1000; // in ms

type CustomTooltipProps = TooltipProps<number, 'date'> & {
  isConcise: boolean;
};

function CustomTooltip({ active, payload, isConcise }: CustomTooltipProps) {
  if (!active || !payload) {
    return null;
  }

  const [{ payload: data }] = payload;

  return (
    <div
      className={`${css({
        pointerEvents: 'none',
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      })}`}
    >
      <div>
        <div style={{ marginBottom: 10 }}>
          <strong>
            {d.format(data.date, isConcise ? 'MMMM yyyy' : 'MMMM dd, yyyy')}
          </strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          {data.income > 0 && (
            <AlignedText
              left="Income:"
              right={
                <Text>
                  <PrivacyFilter>{amountToCurrency(data.income)}</PrivacyFilter>
                </Text>
              }
            />
          )}
          {data.futureIncome > 0 && (
            <AlignedText
              left="Future Income:"
              right={
                <Text>
                  <PrivacyFilter>
                    {amountToCurrency(data.futureIncome)}
                  </PrivacyFilter>
                </Text>
              }
            />
          )}
          {data.expenses < 0 && (
            <AlignedText
              left="Expenses:"
              right={
                <Text>
                  <PrivacyFilter>
                    {amountToCurrency(data.expenses)}
                  </PrivacyFilter>
                </Text>
              }
            />
          )}
          {data.futureExpenses < 0 && (
            <AlignedText
              left="Future Expenses:"
              right={
                <Text>
                  <PrivacyFilter>
                    {amountToCurrency(data.futureExpenses)}
                  </PrivacyFilter>
                </Text>
              }
            />
          )}
          <AlignedText
            left="Change:"
            right={
              <Text>
                <PrivacyFilter>
                  <strong>
                    {amountToCurrency(
                      data.income +
                        data.expenses +
                        data.futureIncome +
                        data.futureExpenses,
                    )}
                  </strong>
                </PrivacyFilter>
              </Text>
            }
          />
          {data.transfers !== 0 && (
            <AlignedText
              left="Transfers:"
              right={
                <Text>
                  <PrivacyFilter>
                    {amountToCurrency(data.transfers)}
                  </PrivacyFilter>
                </Text>
              }
            />
          )}
          <AlignedText
            left="Balance:"
            right={
              <Text>
                <PrivacyFilter>
                  {amountToCurrency(data.balanceTotal)}
                </PrivacyFilter>
              </Text>
            }
          />
        </div>
      </div>
    </div>
  );
}

// To ensure a smooth between solid and dashed, there are two identical lines ...
// ... each with the  unwanted part hidden (opacity=0) using a gradient
const gradientTwoColors = (
  id: string,
  col1: string,
  col2: string,
  percentChange: number,
) => (
  <linearGradient id={id} x1="0" y1="0" x2="100%" y2="0">
    <stop offset="0%" stopColor={col1} />
    <stop offset={`${percentChange}%`} stopColor={col1} />
    <stop offset={`${percentChange}%`} stopColor={`${col2}`} />
    <stop offset="100%" stopColor={col2} />
  </linearGradient>
);

type CashFlowGraphProps = {
  graphData: {
    expenses: { x: Date; y: number }[];
    income: { x: Date; y: number }[];
    balances: { x: Date; y: number }[];
    futureBalances: { x: Date; y: number }[];
    futureExpenses: { x: Date; y: number }[];
    futureIncome: { x: Date; y: number }[];
    transfers: { x: Date; y: number }[];
  };
  isConcise: boolean;
  showBalance?: boolean;
};
export function CashFlowGraph({
  graphData,
  isConcise,
  showBalance = true,
}: CashFlowGraphProps) {
  const privacyMode = usePrivacyMode();
  const [yAxisIsHovered, setYAxisIsHovered] = useState(false);

  // get all dates
  // TODO: All of this toISOString business seems excessive ...
  // but otherwise the dates cannot be correctly compared...
  const dates = Array.from(
    new Set([
      ...graphData.expenses.map(expense => expense.x.toISOString()),
      ...graphData.income.map(expense => expense.x.toISOString()),
      ...graphData.balances.map(expense => expense.x.toISOString()),
      ...graphData.futureExpenses.map(expense => expense.x.toISOString()),
      ...graphData.futureIncome.map(expense => expense.x.toISOString()),
      ...graphData.futureBalances.map(expense => expense.x.toISOString()),
      ...graphData.transfers.map(expense => expense.x.toISOString()),
    ]),
  );

  const data = dates.map(d => ({
    date: new Date(d),
    expenses: (
      graphData.expenses.find(obj => obj.x.toISOString() === d) || { y: 0 }
    ).y,
    income: (
      graphData.income.find(obj => obj.x.toISOString() === d) || { y: 0 }
    ).y,
    balance: (
      graphData.balances.find(obj => obj.x.toISOString() === d) || { y: 0 }
    ).y,
    futureExpenses: (
      graphData.futureExpenses.find(obj => obj.x.toISOString() === d) || {
        y: 0,
      }
    ).y,
    futureIncome: (
      graphData.futureIncome.find(obj => obj.x.toISOString() === d) || { y: 0 }
    ).y,
    futureBalance: (
      graphData.futureBalances.find(obj => obj.x.toISOString() === d) || {
        y: 0,
      }
    ).y,
    transfers: (
      graphData.transfers.find(obj => obj.x.toISOString() === d) || { y: 0 }
    ).y,
    balanceTotal: graphData.futureBalances.find(
      obj => obj.x.toISOString() === d,
    )
      ? (
          graphData.futureBalances.find(obj => obj.x.toISOString() === d) || {
            y: 0,
          }
        ).y
      : (graphData.balances.find(obj => obj.x.toISOString() === d) || { y: 0 })
          .y,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart stackOffset="sign" data={data}>
        <defs>
          {gradientTwoColors(
            'hideFuture',
            theme.pageTextLight,
            'rgba(0,0,0,0)',
            // TODO: Basing this on date would be most clean!
            (100 * graphData.balances.length) /
              (graphData.balances.length + graphData.futureBalances.length),
          )}
          {gradientTwoColors(
            'showFutureOnly',
            'rgba(0,0,0,0)',
            theme.pageTextLight,
            (100 * graphData.balances.length) /
              (graphData.balances.length + graphData.futureBalances.length),
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: theme.reportsLabel }}
          tickFormatter={x => {
            // eslint-disable-next-line rulesdir/typography
            return d.format(x, isConcise ? "MMM ''yy" : 'MMM d');
          }}
          minTickGap={50}
        />
        <YAxis
          tick={{ fill: theme.reportsLabel }}
          tickCount={8}
          tickFormatter={value =>
            privacyMode && !yAxisIsHovered
              ? '...'
              : amountToCurrencyNoDecimal(value)
          }
          onMouseEnter={() => setYAxisIsHovered(true)}
          onMouseLeave={() => setYAxisIsHovered(false)}
        />
        <Tooltip
          labelFormatter={x => {
            // eslint-disable-next-line rulesdir/typography
            return d.format(x, isConcise ? "MMM ''yy" : 'MMM d');
          }}
          content={<CustomTooltip isConcise={isConcise} />}
          isAnimationActive={false}
        />

        <ReferenceLine y={0} stroke="#000" />
        <Bar
          dataKey="income"
          stackId="a"
          fill={chartTheme.colors.blue}
          maxBarSize={MAX_BAR_SIZE}
          animationDuration={ANIMATION_DURATION}
        />
        <Bar
          dataKey="expenses"
          stackId="a"
          fill={chartTheme.colors.red}
          maxBarSize={MAX_BAR_SIZE}
          animationDuration={ANIMATION_DURATION}
        />
        <Bar
          dataKey="futureIncome"
          stackId="a"
          fill={theme.reportsBlueFaded}
          maxBarSize={MAX_BAR_SIZE}
          animationDuration={ANIMATION_DURATION}
        />
        <Bar
          dataKey="futureExpenses"
          stackId="a"
          fill={theme.reportsRedFaded}
          maxBarSize={MAX_BAR_SIZE}
          animationDuration={ANIMATION_DURATION}
        />
        <Line
          type="monotone"
          dataKey="balanceTotal"
          dot={false}
          hide={!showBalance}
          stroke="url(#hideFuture)"
          strokeWidth={2}
          animationDuration={ANIMATION_DURATION}
        />
        <Line
          type="monotone"
          dataKey="balanceTotal"
          dot={false}
          hide={!showBalance}
          stroke="url(#showFutureOnly)"
          strokeWidth={2}
          strokeDasharray="4 3"
          animationDuration={ANIMATION_DURATION}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
