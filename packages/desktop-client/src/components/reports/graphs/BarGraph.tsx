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

import usePrivacyMode from 'loot-core/src/client/privacy';
import { amountToCurrency } from 'loot-core/src/shared/util';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import AlignedText from '../../common/AlignedText';
import PrivacyFilter from '../../PrivacyFilter';
import Container from '../Container';
import { type DataEntity } from '../entities';
import getCustomTick from '../getCustomTick';
import numberFormatterTooltip from '../numberFormatter';

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
            <PrivacyFilter>
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
            </PrivacyFilter>
          </div>
        </div>
      </div>
    );
  }
};

const renderCustomLabel = props => {
  return (
    <text
      x={props.x + props.width / 2}
      y={props.y - (props.value > 0 ? 15 : -15)}
      fill={theme.pageText}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {props.value.toFixed(0)}
    </text>
  );
};

type BarGraphProps = {
  style?: CSSProperties;
  data: DataEntity;
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

  const yAxis = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';
  const splitData = ['Month', 'Year'].includes(groupBy) ? 'monthData' : 'data';

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

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height, portalHost) =>
        data[splitData] && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <BarChart
                width={width}
                height={height}
                stackOffset="sign"
                data={data[splitData]}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <Tooltip
                  content={
                    <CustomTooltip
                      balanceTypeOp={balanceTypeOp}
                      yAxis={yAxis}
                    />
                  }
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                {!compact && <CartesianGrid strokeDasharray="3 3" />}
                {!compact && (
                  <XAxis
                    dataKey={yAxis}
                    angle={-35}
                    textAnchor="end"
                    height={Math.sqrt(longestLabelLength) * 25}
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                  />
                )}
                {!compact && (
                  <YAxis
                    tickFormatter={value => getCustomTick(value, privacyMode)}
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                  />
                )}
                {!compact && (
                  <ReferenceLine y={0} stroke={theme.pageTextLight} />
                )}
                <Bar dataKey={val => getVal(val)} stackId="a">
                  {viewLabels && (
                    <LabelList
                      dataKey={val => getVal(val)}
                      content={renderCustomLabel}
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
                    {viewLabels && (
                      <LabelList
                        dataKey="totalDebts"
                        content={renderCustomLabel}
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
