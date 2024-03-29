import React, { useState } from 'react';

import * as d from 'date-fns';
import { css } from 'glamor';
import {
  Bar,
  Cell,
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
          <AlignedText left="Income:" right={amountToCurrency(data.income)} />
          <AlignedText
            left="Expenses:"
            right={amountToCurrency(data.expenses)}
          />
          <AlignedText
            left="Change:"
            right={
              <strong>{amountToCurrency(data.income + data.expenses)}</strong>
            }
          />
          {data.transfers !== 0 && (
            <AlignedText
              left="Transfers:"
              right={amountToCurrency(data.transfers)}
            />
          )}
          <AlignedText left="Balance:" right={amountToCurrency(data.balance)} />
        </div>
      </div>
    </div>
  );
}

// To ensure a smooth between solid and dashed, there are two identical lines ...
// ... each with the  unwanted part hidden (opacity=0) using a gradient
const gradientTwoColors = (id, col1, col2, percentChange) => (
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

  const data = graphData.expenses.map((row, idx) => ({
    date: row.x,
    expenses: row.y,
    income: graphData.income[idx].y,
    balance: graphData.balances[idx].y,
    transfers: graphData.transfers[idx].y,
    isFuture: false,
  })).concat(graphData.futureExpenses.map((row, idx) => ({
    date: row.x,
    expenses: row.y,
    income: graphData.futureIncome[idx].y,
    balance: graphData.futureBalances[idx].y,
    transfers: 0,
    isFuture: true,
  })));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart stackOffset="sign" data={data}>
        <defs>
          {gradientTwoColors(
              "hideFuture",
              theme.pageTextLight,
              "rgba(0,0,0,0)",
              100-100*data.filter(d => d.isFuture).length/(data.length-0.5)
          )}
          {gradientTwoColors(
              "showFutureOnly",
              "rgba(0,0,0,0)",
              theme.pageTextLight,
              100-100*data.filter(d => d.isFuture).length/(data.length-0.5)
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
          maxBarSize={MAX_BAR_SIZE}
          animationDuration={ANIMATION_DURATION}
        >
          {data.map((entry, index) => (
            <Cell fill={entry.isFuture ? theme.reportsBlueFaded : chartTheme.colors.blue }/>
        ))}
        </Bar>
        <Bar
          dataKey="expenses"
          stackId="a"
          maxBarSize={MAX_BAR_SIZE}
          animationDuration={ANIMATION_DURATION}
        >
          {data.map((entry, index) => (
            <Cell fill={entry.isFuture ? theme.reportsRedFaded : chartTheme.colors.red }/>
        ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="balance"
          dot={false}
          hide={!showBalance}
          stroke="url(#hideFuture)"
          strokeWidth={2}
          animationDuration={ANIMATION_DURATION}
        />
        <Line
          type="monotone"
          dataKey="balance"
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
