// @ts-strict-ignore
import React, { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import { parse, getDay } from 'date-fns';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import { computePadding } from './util/computePadding';

import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { numberFormatterTooltip } from '@desktop-client/components/reports/numberFormatter';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

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
  interval?: string;
};

export function NetWorthGraph({
  style,
  graphData,
  compact = false,
  showTooltip = true,
  interval = 'Monthly',
}: NetWorthGraphProps) {
  const { t } = useTranslation();
  const privacyMode = usePrivacyMode();
  const id = useId();
  const format = useFormat();
  const animationProps = useRechartsAnimation({ isAnimationActive: false });

  // Use more aggressive smoothening for high-frequency data
  const interpolationType =
    interval === 'Daily' || interval === 'Weekly' ? 'basis' : 'monotone';

  const tickFormatter = tick => {
    const res = privacyMode
      ? '...'
      : `${format(Math.round(tick), 'financial-no-decimals')}`;

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
  const gradientId = `splitColor-${id}`;

  // Generate weekly tick positions when viewing Daily data
  const weeklyTicks = useMemo(() => {
    if (interval !== 'Daily') {
      return undefined;
    }
    return graphData.data
      .filter(point => {
        const date = parse(point.x, 'yy-MM-dd', new Date());
        return getDay(date) === 1; // Monday
      })
      .map(point => point.x);
  }, [interval, graphData.data]);

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
          className={css([
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
          ])}
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
          <div style={{ ...(!compact && { marginTop: '15px' }) }}>
            <AreaChart
              responsive
              width={width}
              height={height}
              data={graphData.data}
              margin={{
                top: 0,
                right: 0,
                left: compact
                  ? 0
                  : computePadding(
                      graphData.data.map(item => item.y),
                      value => format(value, 'financial-no-decimals'),
                    ),
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
                ticks={weeklyTicks}
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
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
                type={interpolationType}
                dot={false}
                activeDot={false}
                {...animationProps}
                dataKey="y"
                stroke={theme.reportsBlue}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                connectNulls={true}
              />
            </AreaChart>
          </div>
        )
      }
    </Container>
  );
}
