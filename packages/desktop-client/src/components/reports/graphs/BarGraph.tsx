// @ts-strict-ignore
import React from 'react';

import { css } from 'glamor';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts';

import {
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from 'loot-core/src/shared/util';
import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { usePrivacyMode } from '../../../hooks/usePrivacyMode';
import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Container } from '../Container';
import { getCustomTick } from '../getCustomTick';
import { numberFormatterTooltip } from '../numberFormatter';

import { adjustTextSize } from './adjustTextSize';
import { renderCustomLabel } from './renderCustomLabel';

type PayloadChild = {
  props: {
    name: string;
    fill: string;
  };
};

type PayloadItem = {
  payload: {
    name: string;
    totalAssets: number | string;
    totalDebts: number | string;
    totalTotals: number | string;
    networth: number | string;
    totalChange: number | string;
    children: [PayloadChild];
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  balanceTypeOp?: string;
  yAxis?: string;
};

const CustomTooltip = ({
  active,
  payload,
  balanceTypeOp,
  yAxis,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
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
            <strong>{payload[0].payload[yAxis]}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            {['totalAssets', 'totalTotals'].includes(balanceTypeOp) && (
              <AlignedText
                left="Assets:"
                right={amountToCurrency(payload[0].payload.totalAssets)}
              />
            )}
            {['totalDebts', 'totalTotals'].includes(balanceTypeOp) && (
              <AlignedText
                left="Debt:"
                right={amountToCurrency(payload[0].payload.totalDebts)}
              />
            )}
            {['totalTotals'].includes(balanceTypeOp) && (
              <AlignedText
                left="Net:"
                right={
                  <strong>
                    {amountToCurrency(payload[0].payload.totalTotals)}
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

const customLabel = (props, typeOp) => {
  const calcX = props.x + props.width / 2;
  const calcY = props.y - (props.value > 0 ? 15 : -15);
  const textAnchor = 'middle';
  const display =
    props.value !== 0 && `${amountToCurrencyNoDecimal(props.value)}`;
  const textSize = adjustTextSize(
    props.width,
    typeOp === 'totalTotals' ? 'default' : 'variable',
    props.value,
  );

  return renderCustomLabel(calcX, calcY, textAnchor, display, textSize);
};

type BarGraphProps = {
  style?: CSSProperties;
  data: GroupedEntity;
  groupBy: string;
  balanceTypeOp: string;
  compact?: boolean;
  viewLabels: boolean;
};

export function BarGraph({
  style,
  data,
  groupBy,
  balanceTypeOp,
  compact,
  viewLabels,
}: BarGraphProps) {
  const privacyMode = usePrivacyMode();

  const yAxis = groupBy === 'Interval' ? 'date' : 'name';
  const splitData = groupBy === 'Interval' ? 'intervalData' : 'data';
  const labelsMargin = viewLabels ? 30 : 0;

  const getVal = obj => {
    if (balanceTypeOp === 'totalDebts') {
      return -1 * obj.totalDebts;
    } else {
      return obj.totalAssets;
    }
  };

  const longestLabelLength = data[splitData]
    .map(c => c[yAxis])
    .reduce((acc, cur) => (cur.length > acc ? cur.length : acc), 0);

  const largestValue = data[splitData]
    .map(c => c[balanceTypeOp])
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 0;
  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data[splitData] && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <BarChart
                width={width}
                height={height}
                stackOffset="sign"
                data={data[splitData]}
                margin={{
                  top: labelsMargin,
                  right: 0,
                  left: leftMargin,
                  bottom: 0,
                }}
              >
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={
                    <CustomTooltip
                      balanceTypeOp={balanceTypeOp}
                      yAxis={yAxis}
                    />
                  }
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                {!compact && (
                  <>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey={yAxis}
                      angle={-35}
                      textAnchor="end"
                      height={Math.sqrt(longestLabelLength) * 25}
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageText }}
                    />
                    <YAxis
                      tickFormatter={value =>
                        getCustomTick(
                          amountToCurrencyNoDecimal(value),
                          privacyMode,
                        )
                      }
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageText }}
                      tickSize={0}
                    />
                    <ReferenceLine y={0} stroke={theme.pageTextLight} />
                  </>
                )}
                <Bar dataKey={val => getVal(val)} stackId="a">
                  {viewLabels && !compact && (
                    <LabelList
                      dataKey={val => getVal(val)}
                      content={e => customLabel(e, balanceTypeOp)}
                    />
                  )}
                  {data.legend.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      name={entry.name}
                    />
                  ))}
                </Bar>
                {yAxis === 'date' && balanceTypeOp === 'totalTotals' && (
                  <Bar dataKey="totalDebts" stackId="a">
                    {viewLabels && !compact && (
                      <LabelList
                        dataKey="totalDebts"
                        content={e => customLabel(e, balanceTypeOp)}
                      />
                    )}
                    {data[splitData].map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={theme.reportsRed}
                        name={entry.name}
                      />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
