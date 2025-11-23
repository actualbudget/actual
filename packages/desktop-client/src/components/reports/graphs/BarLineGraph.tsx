// @ts-strict-ignore
import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import {
  ComposedChart,
  Line,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { numberFormatterTooltip } from '@desktop-client/components/reports/numberFormatter';
import { useFormat } from '@desktop-client/hooks/useFormat';

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
  const { t } = useTranslation();

  if (active && payload && payload.length) {
    return (
      <div
        className={css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: 10,
        })}
      >
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>{payload[0].payload.date}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <PrivacyFilter>
              <AlignedText
                left={t('Assets:')}
                right={payload[0].payload.assets}
              />
              <AlignedText left={t('Debt:')} right={payload[0].payload.debt} />
              <AlignedText
                left={t('Change:')}
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
  const format = useFormat();
  const animationProps = useRechartsAnimation();
  const tickFormatter = tick => {
    return `${format(Math.round(tick), 'financial')}`; // Formats the tick values as strings with commas
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
          <div>
            {!compact && <div style={{ marginTop: '15px' }} />}
            <ComposedChart
              responsive
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
              {!compact && <CartesianGrid strokeDasharray="3 3" />}
              {!compact && <XAxis dataKey="x" />}
              {!compact && <YAxis dataKey="y" tickFormatter={tickFormatter} />}
              <Bar
                type="monotone"
                dataKey="y"
                fill="#8884d8"
                {...animationProps}
              />
              <Line
                type="monotone"
                dataKey="y"
                stroke="#8884d8"
                {...animationProps}
              />
            </ComposedChart>
          </div>
        )
      }
    </Container>
  );
}
