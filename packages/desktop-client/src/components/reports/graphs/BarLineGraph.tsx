// @ts-strict-ignore
import React from 'react';

import { css } from 'glamor';
import {
  ComposedChart,
  Line,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { amountToCurrencyNoDecimal } from 'loot-core/shared/util';

import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Container } from '../Container';
import { numberFormatterTooltip } from '../numberFormatter';

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

type BarLineGraphProps = {
  style?: CSSProperties;
  data;
  compact?: boolean;
  showTooltip?: boolean;
};

export function BarLineGraph({
  style,
  data,
  compact,
  showTooltip = true,
}: BarLineGraphProps) {
  const tickFormatter = tick => {
    return `${amountToCurrencyNoDecimal(Math.round(tick))}`; // Formats the tick values as strings with commas
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <ComposedChart
                width={width}
                height={height}
                data={data.data}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                {showTooltip && (
                  <Tooltip
                    content={<CustomTooltip />}
                    formatter={numberFormatterTooltip}
                    isAnimationActive={false}
                  />
                )}
                {!compact && (
                  <>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" />
                    <YAxis dataKey="y" tickFormatter={tickFormatter} />
                  </>
                )}
                <Bar type="monotone" dataKey="y" fill="#8884d8" />
                <Line type="monotone" dataKey="y" stroke="#8884d8" />
              </ComposedChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
