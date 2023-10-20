import React from 'react';

import { css } from 'glamor';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { amountToCurrency } from 'loot-core/src/shared/util';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import AlignedText from '../../common/AlignedText';
import PrivacyFilter from '../../PrivacyFilter';
import { getColorScale } from '../chart-theme';
import Container from '../Container';

type StackedBarGraphProps = {
  style?: CSSProperties;
  data;
  typeOp;
  compact: boolean;
  domain?: {
    y?: [number, number];
  };
};
type PotentialNumber = number | string | undefined | null;

const numberFormatterTooltip = (value: PotentialNumber): number | null => {
  if (typeof value === 'number') {
    return Math.round(value);
  }
  return null; // or some default value for other cases
};

function StackedBarGraph({
  style,
  data,
  typeOp,
  compact,
  domain,
}: StackedBarGraphProps) {
  const colorScale = getColorScale('qualitative');

  type PayloadItem = {
    name: string;
    value: number;
    color: string;
  };

  type CustomTooltipProps = {
    active?: boolean;
    payload?: PayloadItem[];
    label?: string;
  };

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`${css(
            {
              zIndex: 1000,
              pointerEvents: 'none',
              borderRadius: 2,
              boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
              backgroundColor: theme.alt2MenuBackground,
              color: theme.alt2MenuItemText,
              padding: 10,
            },
            style,
          )}`}
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
                  .map(
                    pay =>
                      pay.value !== 0 && (
                        <AlignedText
                          key={pay.name}
                          left={pay.name}
                          right={amountToCurrency(pay.value)}
                          style={{ color: pay.color }}
                        />
                      ),
                  )}
              </PrivacyFilter>
            </div>
          </div>
        </div>
      );
    }
  };

  const getVal = (obj, key) => {
    if (typeOp === 'totalDebts') {
      return -1 * obj[key][typeOp];
    } else {
      return obj[key][typeOp];
    }
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height, portalHost) =>
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
                />
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                {data.split.map((c, index) => (
                  <Bar
                    key={c.id}
                    dataKey={val => getVal(val, c.name)}
                    name={c.name}
                    stackId="a"
                    fill={colorScale[index % colorScale.length]}
                  />
                ))}
              </BarChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default StackedBarGraph;
