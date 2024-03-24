// @ts-strict-ignore
import React from 'react';

import { css } from 'glamor';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Container } from '../Container';
import { numberFormatterTooltip } from '../numberFormatter';

type PayloadItem = {
  dataKey: string;
  value: number;
  date: string;
  payload: {
    date: string;
  }
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
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
            <strong>{payload[0].payload.date}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <PrivacyFilter>
              {payload.map((p: PayloadItem) => {
                return <AlignedText left={p.dataKey} right={p.value} />
              })}
            </PrivacyFilter>
          </div>
        </div>
      </div>
    );
  }
};

type LineGraphProps = {
  style?: CSSProperties;
  graphData;
  compact?: boolean;
};

export function LineGraph({ style, graphData, compact }: LineGraphProps) {
  const tickFormatter = tick => {
    return `${Math.round(tick).toLocaleString()}`; // Formats the tick values as strings with commas
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        graphData && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <LineChart
                width={width}
                height={height}
                data={graphData.intervalData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                {<Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />}
                {!compact && (
                  <>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis name="Value" tickFormatter={tickFormatter} />
                  </>
                )}
                {graphData.legend.map((legendItem) => {
                  return <Line type="monotone" dataKey={legendItem.name} stroke={legendItem.color} />
                })}
              </LineChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
