// @ts-strict-ignore
import React from 'react';

import { css } from 'glamor';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from 'loot-core/src/shared/util';
import { type SpendingEntity } from 'loot-core/src/types/models/reports';

import { usePrivacyMode } from '../../../hooks/usePrivacyMode';
import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Container } from '../Container';
import { numberFormatterTooltip } from '../numberFormatter';

type PayloadItem = {
  value: number;
  payload: {
    date: string;
    totalAssets: number | string;
    totalDebts: number | string;
    totalTotals: number | string;
    cumulative: number | string;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  balanceTypeOp?: string;
  thisMonth?: string;
  selection?: string;
};

const CustomTooltip = ({
  active,
  payload,
  balanceTypeOp,
  thisMonth,
  selection,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const comparison =
      selection === 'average'
        ? payload[0].payload[selection] * -1
        : payload[0].payload[selection].cumulative * -1;
    return (
      <div
        className={`${css({
          zIndex: 1000,
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
            <strong>{payload[0].payload[thisMonth].date}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            {['cumulative'].includes(balanceTypeOp) && (
              <>
                <AlignedText
                  left={selection === 'average' ? 'Average' : 'Last month:'}
                  right={amountToCurrency(comparison)}
                />
                {payload[0].payload[thisMonth].cumulative && (
                  <>
                    <AlignedText
                      left="This month:"
                      right={amountToCurrency(
                        payload[0].payload[thisMonth].cumulative * -1,
                      )}
                    />
                    <AlignedText
                      left="Difference:"
                      right={amountToCurrency(
                        payload[0].payload[thisMonth].cumulative * -1 -
                          comparison,
                      )}
                    />
                  </>
                )}
              </>
            )}
            {['totalAssets', 'totalTotals'].includes(balanceTypeOp) && (
              <AlignedText
                left="Assets:"
                right={amountToCurrency(
                  payload[0].payload[thisMonth].totalAssets,
                )}
              />
            )}
            {['totalDebts', 'totalTotals'].includes(balanceTypeOp) && (
              <AlignedText
                left="Debt:"
                right={amountToCurrency(
                  payload[0].payload[thisMonth].totalDebts,
                )}
              />
            )}
            {['totalTotals'].includes(balanceTypeOp) && (
              <AlignedText
                left="Net:"
                right={
                  <strong>
                    {amountToCurrency(
                      payload[0].payload[thisMonth].totalTotals,
                    )}
                  </strong>
                }
              />
            )}
          </div>
        </div>
      </div>
    );
  }
};

type SpendingGraphProps = {
  style?: CSSProperties;
  data: SpendingEntity;
  compact?: boolean;
  mode: string;
};

export function SpendingGraph({
  style,
  data,
  compact,
  mode,
}: SpendingGraphProps) {
  const privacyMode = usePrivacyMode();
  const balanceTypeOp = 'cumulative';
  const thisMonth = monthUtils.currentMonth();
  const lastMonth = monthUtils.subMonths(monthUtils.currentMonth(), 1);
  const selection = mode.toLowerCase() === 'average' ? 'average' : lastMonth;
  const thisMonthMax = data.intervalData.reduce((a, b) =>
    a[thisMonth][balanceTypeOp] < b[thisMonth][balanceTypeOp] ? a : b,
  )[thisMonth][balanceTypeOp];
  const selectionMax =
    selection === 'average'
      ? data.intervalData[27].average
      : data.intervalData.reduce((a, b) =>
          a[lastMonth][balanceTypeOp] < b[lastMonth][balanceTypeOp] ? a : b,
        )[lastMonth][balanceTypeOp];
  const maxYAxis = selectionMax > thisMonthMax;
  const dataMax = Math.max(...data.intervalData.map(i => i[balanceTypeOp]));
  const dataMin = Math.min(...data.intervalData.map(i => i[balanceTypeOp]));

  const tickFormatter = tick => {
    if (!privacyMode) return `${amountToCurrencyNoDecimal(tick)}`; // Formats the tick values as strings with commas
    return '...';
  };

  const gradientOffset = () => {
    if (dataMax <= 0) {
      return 0;
    }
    if (dataMin >= 0) {
      return 1;
    }

    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  const getVal = (obj, month) => {
    if (month === 'average') {
      return obj[month] && -1 * obj[month];
    } else {
      return obj[month][balanceTypeOp] && -1 * obj[month][balanceTypeOp];
    }
  };

  const getDate = obj => {
    return obj[thisMonth].date;
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data.intervalData && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <AreaChart
                width={width}
                height={height}
                data={data.intervalData}
                margin={{
                  top: 0,
                  right: 0,
                  left: 0,
                  bottom: 0,
                }}
              >
                {compact ? null : (
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                )}
                {compact ? null : (
                  <XAxis
                    dataKey={val => getDate(val)}
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                  />
                )}
                {compact ? null : (
                  <YAxis
                    dataKey={val =>
                      getVal(val, maxYAxis ? thisMonth : selection)
                    }
                    domain={[0, 'auto']}
                    tickFormatter={tickFormatter}
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                    tickSize={0}
                  />
                )}
                <Tooltip
                  content={
                    <CustomTooltip
                      balanceTypeOp={balanceTypeOp}
                      thisMonth={thisMonth}
                      selection={selection}
                    />
                  }
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                <defs>
                  <linearGradient
                    id={`fill${balanceTypeOp}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset={off}
                      stopColor={theme.reportsGreen}
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                  <linearGradient
                    id={`stroke${balanceTypeOp}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset={off}
                      stopColor={theme.reportsGreen}
                      stopOpacity={1}
                    />
                  </linearGradient>
                </defs>

                <Area
                  type="linear"
                  dot={false}
                  activeDot={{
                    fill: theme.reportsGreen,
                    fillOpacity: 1,
                    r: 10,
                  }}
                  animationDuration={0}
                  dataKey={val => getVal(val, thisMonth)}
                  stroke={`url(#stroke${balanceTypeOp})`}
                  strokeWidth={3}
                  fill={`url(#fill${balanceTypeOp})`}
                  fillOpacity={1}
                />
                <Area
                  type="linear"
                  dot={false}
                  activeDot={false}
                  animationDuration={0}
                  dataKey={val => getVal(val, selection)}
                  stroke="gray"
                  strokeDasharray="10 10"
                  strokeWidth={3}
                  fill="gray"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
