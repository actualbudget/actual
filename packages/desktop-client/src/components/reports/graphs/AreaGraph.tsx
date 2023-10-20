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

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import AlignedText from '../../common/AlignedText';
import PrivacyFilter from '../../PrivacyFilter';
import Container from '../Container';

type AreaGraphProps = {
  style?: CSSProperties;
  data;
  typeOp;
  compact: boolean;
  domain?: {
    totalTotals?: [number, number];
  };
};
type PotentialNumber = number | string | undefined | null;

const numberFormatterTooltip = (value: PotentialNumber): number | null => {
  if (typeof value === 'number') {
    return Math.round(value);
  }
  return null; // or some default value for other cases
};

function AreaGraph({ style, data, typeOp, compact }: AreaGraphProps) {
  const tickFormatter = tick => {
    return `${Math.round(tick).toLocaleString()}`; // Formats the tick values as strings with commas
  };

  const gradientOffset = () => {
    const dataMax = Math.max(...data.monthData.map(i => i[typeOp]));
    const dataMin = Math.min(...data.monthData.map(i => i[typeOp]));

    if (dataMax <= 0) {
      return 0;
    }
    if (dataMin >= 0) {
      return 1;
    }

    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  type PayloadItem = {
    payload: {
      date: string;
      totalAssets: number | string;
      totalDebts: number | string;
      totalTotals: number | string;
    };
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
              <strong>{payload[0].payload.date}</strong>
            </div>
            <div style={{ lineHeight: 1.5 }}>
              <PrivacyFilter>
                <AlignedText
                  left="Assets:"
                  right={payload[0].payload.totalAssets}
                />
                <AlignedText
                  left="Debt:"
                  right={payload[0].payload.totalDebts}
                />
                <AlignedText
                  left="All:"
                  right={<strong>payload[0].payload.totalTotals</strong>}
                />
              </PrivacyFilter>
            </div>
          </div>
        </div>
      );
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
              <AreaChart
                width={width}
                height={height}
                data={data.monthData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                {compact ? null : (
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                )}
                {compact ? null : <XAxis dataKey="date" />}
                {compact ? null : (
                  <YAxis
                    dataKey={...typeOp}
                    domain={['auto', 'auto']}
                    tickFormatter={tickFormatter}
                  />
                )}
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                <defs>
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset={off}
                      stopColor={theme.reportsBlue}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset={off}
                      stopColor={theme.reportsRed}
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                </defs>

                <Area
                  type="linear"
                  dot={false}
                  activeDot={false}
                  animationDuration={0}
                  dataKey={...typeOp}
                  stroke={theme.reportsBlue}
                  fill="url(#splitColor)"
                  fillOpacity={1}
                />
              </AreaChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default AreaGraph;
