import React from 'react';

import { css } from 'glamor';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import AlignedText from '../../common/AlignedText';
import Container from '../Container';

type DonutGraphProps = {
  style?: CSSProperties;
  graphData;
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

function DonutGraph({ style, graphData, compact, domain }: DonutGraphProps) {
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
                left="Change:"
                right={<strong>{payload[0].payload.change}</strong>}
              />
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
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <PieChart width={width} height={height}>
                <Pie
                  dataKey="y"
                  nameKey="x"
                  isAnimationActive={false}
                  data={graphData.data}
                  outerRadius={80}
                  fill="#8884d8"
                />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
              </PieChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default DonutGraph;
