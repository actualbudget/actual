// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next';

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

import { amountToCurrencyNoDecimal } from 'loot-core/shared/util';

import { usePrivacyMode } from '../../../hooks/usePrivacyMode';
import { theme, type CSSProperties } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Container } from '../Container';
import { numberFormatterTooltip } from '../numberFormatter';

type NetWorthGraphProps = {
  style?: CSSProperties;
  graphData: {
    data: Array<{
      x: string;
      y: number;
      assets: string;
      debt: string;
      change: string;
      networth: string;
      date: string;
    }>;
    hasNegative: boolean;
    start: string;
    end: string;
  };
  compact?: boolean;
  showTooltip?: boolean;
};

export function NetWorthGraph({
  style,
  graphData,
  compact = false,
  showTooltip = true,
}: NetWorthGraphProps) {
  const { t } = useTranslation();
  const privacyMode = usePrivacyMode();

  const tickFormatter = tick => {
    const res = privacyMode
      ? '...'
      : `${amountToCurrencyNoDecimal(Math.round(tick))}`; // Formats the tick values as strings with commas

    return res;
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

  // eslint-disable-next-line react/no-unstable-nested-components
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`${css(
            {
              zIndex: 1000,
              pointerEvents: 'none',
              borderRadius: 2,
              boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
              backgroundColor: theme.menuBackground,
              color: theme.menuItemText,
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
              <AlignedText
                left={t('Assets:')}
                right={payload[0].payload.assets}
              />
              <AlignedText left={t('Debt:')} right={payload[0].payload.debt} />
              <AlignedText
                left={t('Net worth:')}
                right={<strong>{payload[0].payload.networth}</strong>}
              />
              <AlignedText
                left={t('Change:')}
                right={payload[0].payload.change}
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
      {(width, height) =>
        graphData && (
          <ResponsiveContainer>
            <div style={{ ...(!compact && { marginTop: '15px' }) }}>
              <AreaChart
                width={width}
                height={height}
                data={graphData.data}
                margin={{
                  top: 0,
                  right: 0,
                  left: compact ? 0 : computePadding(graphData.data),
                  bottom: 0,
                }}
              >
                {compact ? null : (
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                )}
                <XAxis
                  dataKey="x"
                  hide={compact}
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                />
                <YAxis
                  dataKey="y"
                  domain={['auto', 'auto']}
                  hide={compact}
                  tickFormatter={tickFormatter}
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                />
                {showTooltip && (
                  <Tooltip
                    content={<CustomTooltip />}
                    formatter={numberFormatterTooltip}
                    isAnimationActive={false}
                  />
                )}
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
                  dataKey="y"
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

/**
 * Add left padding for Y-axis for when large amounts get clipped
 * @param netWorthData
 * @returns left padding for Net worth graph
 */
function computePadding(netWorthData: Array<{ y: number }>) {
  /**
   * Convert to string notation, get longest string length
   */
  const maxLength = Math.max(
    ...netWorthData.map(({ y }) => {
      return amountToCurrencyNoDecimal(Math.round(y)).length;
    }),
  );

  // No additional left padding is required for upto 5 characters
  return Math.max(0, (maxLength - 5) * 5);
}
