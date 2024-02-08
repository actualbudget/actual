// @ts-strict-ignore
import React from 'react';

import { css } from 'glamor';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts';

import { usePrivacyMode } from 'loot-core/src/client/privacy';
import {
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from 'loot-core/src/shared/util';
import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Container } from '../Container';
import { getCustomTick } from '../getCustomTick';
import { numberFormatterTooltip } from '../numberFormatter';

import { renderCustomLabel } from './renderCustomLabel';

type PayloadItem = {
  name: string;
  value: number;
  color: string;
  payload: {
    name: string;
    color: number | string;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    let sumTotals = 0;
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
            <strong>{label}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <PrivacyFilter>
              {payload
                .slice(0)
                .reverse()
                .map(pay => {
                  sumTotals += pay.value;
                  return (
                    pay.value !== 0 && (
                      <AlignedText
                        key={pay.name}
                        left={pay.name}
                        right={amountToCurrency(pay.value)}
                        style={{ color: pay.color }}
                      />
                    )
                  );
                })}
              <AlignedText
                left="Total"
                right={amountToCurrency(sumTotals)}
                style={{
                  fontWeight: 600,
                }}
              />
            </PrivacyFilter>
          </div>
        </div>
      </div>
    );
  }
};

const customLabel = props => {
  const calcX = props.x + props.width / 2;
  const calcY = props.y + props.height / 2;
  const textAnchor = 'middle';
  const display = props.value && `${amountToCurrencyNoDecimal(props.value)}`;
  const textSize = '12px';
  const showLabel = props.height;
  const showLabelThreshold = 20;
  const fill = theme.reportsInnerLabel;

  return renderCustomLabel(
    calcX,
    calcY,
    textAnchor,
    display,
    textSize,
    showLabel,
    showLabelThreshold,
    fill,
  );
};

type StackedBarGraphProps = {
  style?: CSSProperties;
  data: GroupedEntity;
  compact?: boolean;
  viewLabels: boolean;
};

export function StackedBarGraph({
  style,
  data,
  compact,
  viewLabels,
}: StackedBarGraphProps) {
  const privacyMode = usePrivacyMode();

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data.monthData && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <BarChart
                width={width}
                height={height}
                data={data.monthData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                  cursor={{ fill: 'transparent' }}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                />
                {!compact && (
                  <>
                    <CartesianGrid strokeDasharray="3 3" />
                    <YAxis
                      tickFormatter={value => getCustomTick(value, privacyMode)}
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageText }}
                    />
                  </>
                )}
                {data.legend
                  .slice(0)
                  .reverse()
                  .map(entry => (
                    <Bar
                      key={entry.name}
                      dataKey={entry.name}
                      stackId="a"
                      fill={entry.color}
                    >
                      {viewLabels && !compact && (
                        <LabelList dataKey={entry.name} content={customLabel} />
                      )}
                    </Bar>
                  ))}
              </BarChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
