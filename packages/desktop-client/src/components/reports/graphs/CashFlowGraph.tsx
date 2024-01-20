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

import { usePrivacyMode } from 'loot-core/src/client/privacy';
import {
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from 'loot-core/src/shared/util';

import { theme } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { PrivacyFilter } from '../../PrivacyFilter';
import { chartTheme } from '../chart-theme';

const MAX_BAR_SIZE = 50;

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
          <AlignedText
            left="Income:"
            right={
              <PrivacyFilter>{amountToCurrency(data.income)}</PrivacyFilter>
            }
          />
          <AlignedText
            left="Expenses:"
            right={
              <PrivacyFilter>{amountToCurrency(data.expenses)}</PrivacyFilter>
            }
          />
          <AlignedText
            left="Change:"
            right={
              <strong>
                <PrivacyFilter>
                  {amountToCurrency(data.income + data.expenses)}
                </PrivacyFilter>
              </strong>
            }
          />
          <AlignedText
            left="Balance:"
            right={
              <PrivacyFilter>{amountToCurrency(data.balance)}</PrivacyFilter>
            }
          />
        </div>
      </div>
    </div>
  );
}

type CashFlowGraphProps = {
  graphData: {
    expenses: { x: Date; y: number }[];
    income: { x: Date; y: number }[];
    balances: { x: Date; y: number }[];
  };
  isConcise: boolean;
};
export function CashFlowGraph({ graphData, isConcise }: CashFlowGraphProps) {
  const privacyMode = usePrivacyMode();
  const [yAxisIsHovered, setYAxisIsHovered] = useState(false);

  const data = graphData.expenses.map((row, idx) => ({
    date: row.x,
    expenses: row.y,
    income: graphData.income[idx].y,
    balance: graphData.balances[idx].y,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart stackOffset="sign" data={data}>
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
        />
        <Bar
          dataKey="expenses"
          stackId="a"
          fill={chartTheme.colors.red}
          maxBarSize={MAX_BAR_SIZE}
        />
        <Line
          type="monotone"
          dataKey="balance"
          dot={false}
          stroke={theme.pageTextLight}
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
