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
import AlignedText from '../../common/AlignedText';
import PrivacyFilter from '../../PrivacyFilter';
import Container from '../Container';
import numberFormatterTooltip from '../numberFormatter';

type PayloadItem = {
  payload: {
    date: string;
    assets: number | string;
    debt: number | string;
    networth: number | string;
    change: number | string;
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
        className={`${css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuAutoCompleteBackground,
          color: theme.menuAutoCompleteText,
          padding: 10,
        })}`}
      >
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>{payload[0].payload.date}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <PrivacyFilter>
              <AlignedText left="Assets:" right={payload[0].payload.assets} />
              <AlignedText left="Debt:" right={payload[0].payload.debt} />
              <AlignedText
                left="Change:"
                right={<strong>{payload[0].payload.change}</strong>}
              />
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
  compact: boolean;
  domain?: {
    y?: [number, number];
  };
};

function LineGraph({ style, graphData, compact, domain }: LineGraphProps) {
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
      {(width, height, portalHost) =>
        graphData && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <LineChart
                width={width}
                height={height}
                data={graphData.data}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" />
                <YAxis dataKey="y" tickFormatter={tickFormatter} />
                <Line type="monotone" dataKey="y" stroke="#8884d8" />
              </LineChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default LineGraph;
