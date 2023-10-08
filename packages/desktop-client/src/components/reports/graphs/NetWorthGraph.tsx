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
import Container from '../Container';

type NetWorthGraphProps = {
  style?: CSSProperties;
  graphData;
  compact: boolean;
  domain?: {
    y?: [number, number];
  };
};

function NetWorthGraph({
  style,
  graphData,
  compact,
  domain,
}: NetWorthGraphProps) {
  const tickFormatter = tick => {
    return `${Math.round(tick).toLocaleString()}`; // Formats the tick values as strings with commas
  };

  const gradientOffset = () => {
    const dataMax = Math.max(...graphData.data.map(i => i.y));
    const dataMin = Math.min(...graphData.data.map(i => i.y));

    if (dataMax <= 0) {
      return 0;
    }
    if (dataMin >= 0) {
      return 1;
    }

    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  const CustomTooltip = ({ active, payload, label }) => {
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
              <AlignedText left="Assets:" right={payload[0].payload.assets} />
              <AlignedText left="Debt:" right={payload[0].payload.debt} />
              <AlignedText
                left="Net worth:"
                right={<strong>{payload[0].payload.networth}</strong>}
              />
              <AlignedText left="Change:" right={payload[0].payload.change} />
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
        graphData && (
          <ResponsiveContainer>
            <AreaChart
              width={width}
              height={height}
              data={graphData.data}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              {compact ? null : (
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
              )}
              {compact ? null : <XAxis dataKey="x" />}
              {compact ? null : (
                <YAxis
                  dataKey="y"
                  domain={['auto', 'auto']}
                  tickFormatter={tickFormatter}
                />
              )}
              <Tooltip
                content={<CustomTooltip />}
                formatter={value => Math.round(value)}
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
                type="monotone"
                dot={false}
                activeDot={false}
                animationDuration={0}
                dataKey="y"
                stroke={theme.reportsBlue}
                fill="url(#splitColor)"
                fillOpacity={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default NetWorthGraph;
