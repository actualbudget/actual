// @ts-strict-ignore
import React, { type ComponentProps, type CSSProperties } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import { type SpendingEntity } from 'loot-core/types/models';

import { computePadding } from './util/computePadding';

import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { numberFormatterTooltip } from '@desktop-client/components/reports/numberFormatter';
import { useFormat, type FormatType } from '@desktop-client/hooks/useFormat';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

type PayloadItem = {
  value: number;
  payload: {
    totalAssets: number | string;
    totalDebts: number | string;
    totalTotals: number | string;
    day: string;
    months: Record<
      string,
      {
        date: string;
        cumulative: number;
      }
    >;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  balanceTypeOp: 'cumulative';
  selection: string | 'budget' | 'average';
  compare: string;
  format: (value: unknown, type?: FormatType) => string;
};

const CustomTooltip = ({
  active,
  payload,
  balanceTypeOp,
  selection,
  compare,
  format,
}: CustomTooltipProps) => {
  const { t } = useTranslation();

  if (active && payload && payload.length) {
    const comparison = ['average', 'budget'].includes(selection)
      ? payload[0].payload[selection] * -1
      : (payload[0].payload.months[selection]?.cumulative ?? 0) * -1;
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
            <strong>
              <Trans>
                Day:{' '}
                {{
                  dayOfMonth:
                    Number(payload[0].payload.day) >= 28
                      ? t('28+')
                      : payload[0].payload.day,
                }}
              </Trans>
            </strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            {payload[0].payload.months[compare]?.cumulative ? (
              <AlignedText
                left={t('Compare:')}
                right={format(
                  payload[0].payload.months[compare]?.cumulative * -1,
                  'financial',
                )}
              />
            ) : null}
            {['cumulative'].includes(balanceTypeOp) && (
              <AlignedText
                left={
                  selection === 'average'
                    ? t('Average:')
                    : selection === 'budget'
                      ? t('Budgeted:')
                      : t('To:')
                }
                right={format(Math.round(comparison), 'financial')}
              />
            )}
            {payload[0].payload.months[compare]?.cumulative ? (
              <AlignedText
                left={t('Difference:')}
                right={format(
                  Math.round(
                    payload[0].payload.months[compare]?.cumulative * -1 -
                      comparison,
                  ),
                  'financial',
                )}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }
};

type SpendingGraphProps = {
  style?: CSSProperties;
  data: SpendingEntity;
  compact?: boolean;
  mode: 'single-month' | 'budget' | 'average';
  compare: string;
  compareTo: string;
};

export function SpendingGraph({
  style,
  data,
  compact,
  mode,
  compare,
  compareTo,
}: SpendingGraphProps) {
  const privacyMode = usePrivacyMode();
  const animationProps = useRechartsAnimation({ isAnimationActive: false });
  const balanceTypeOp = 'cumulative';
  const format = useFormat();

  const selection = mode === 'single-month' ? compareTo : mode;

  const thisMonthMax = data.intervalData.reduce((a, b) =>
    a.months[compare]?.[balanceTypeOp] < b.months[compare]?.[balanceTypeOp]
      ? a
      : b,
  ).months[compare]?.[balanceTypeOp];
  const selectionMax = ['average', 'budget'].includes(selection)
    ? data.intervalData[27][selection]
    : data.intervalData.reduce((a, b) =>
        a.months[selection]?.[balanceTypeOp] <
        b.months[selection]?.[balanceTypeOp]
          ? a
          : b,
      ).months[selection]?.[balanceTypeOp];
  const maxYAxis = selectionMax > thisMonthMax;
  const dataMax = Math.max(
    ...data.intervalData.map(i => i.months[compare]?.cumulative),
  );
  const dataMin = Math.min(
    ...data.intervalData.map(i => i.months[compare]?.cumulative),
  );

  const tickFormatter: ComponentProps<typeof YAxis>['tickFormatter'] = tick => {
    if (!privacyMode) return `${format(tick, 'financial-no-decimals')}`;
    return '...';
  };

  const gradientOffset = () => {
    if (!dataMax || dataMax <= 0) {
      return 0;
    }
    if (!dataMin || dataMin >= 0) {
      return 1;
    }

    return dataMax / (dataMax - dataMin);
  };

  const getVal = (obj, month) => {
    if (['average', 'budget'].includes(month)) {
      return obj[month] && -1 * obj[month];
    } else {
      return (
        obj.months[month]?.[balanceTypeOp] &&
        -1 * obj.months[month][balanceTypeOp]
      );
    }
  };

  const getDate = obj => {
    return Number(obj.day) >= 28 ? '28+' : obj.day;
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data.intervalData && (
          <div>
            {!compact && <div style={{ marginTop: '5px' }} />}
            <AreaChart
              responsive
              width={width}
              height={height}
              data={data.intervalData}
              margin={{
                top: 0,
                right: 0,
                left: computePadding(
                  data.intervalData
                    .map(item => getVal(item, maxYAxis ? compare : selection))
                    .filter(value => value !== undefined),
                  (value: number) => format(value, 'financial-no-decimals'),
                ),
                bottom: 0,
              }}
            >
              {compact ? null : (
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
              )}
              {compact ? null : (
                <XAxis
                  dataKey={val => getDate(val)}
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                />
              )}
              {compact ? null : (
                <YAxis
                  dataKey={val => getVal(val, maxYAxis ? compare : selection)}
                  domain={[0, 'auto']}
                  tickFormatter={tickFormatter}
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                  tickSize={0}
                />
              )}
              <Tooltip
                content={
                  <CustomTooltip
                    balanceTypeOp={balanceTypeOp}
                    selection={selection}
                    compare={compare}
                    format={format}
                  />
                }
                formatter={numberFormatterTooltip}
                isAnimationActive={false}
              />
              <defs>
                <linearGradient
                  id={`fill${balanceTypeOp}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset={gradientOffset()}
                    stopColor={theme.reportsGreen}
                    stopOpacity={0.2}
                  />
                </linearGradient>
                <linearGradient
                  id={`stroke${balanceTypeOp}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset={gradientOffset()}
                    stopColor={theme.reportsGreen}
                    stopOpacity={1}
                  />
                </linearGradient>
              </defs>

              <Area
                type="linear"
                dot={false}
                activeDot={{
                  fill: theme.reportsGreen,
                  fillOpacity: 1,
                  r: 10,
                }}
                {...animationProps}
                dataKey={val => getVal(val, compare)}
                stroke={`url(#stroke${balanceTypeOp})`}
                strokeWidth={3}
                fill={`url(#fill${balanceTypeOp})`}
                fillOpacity={1}
              />
              <Area
                type="linear"
                dot={false}
                activeDot={false}
                {...animationProps}
                dataKey={val => getVal(val, selection)}
                stroke={theme.reportsGray}
                strokeDasharray="10 10"
                strokeWidth={3}
                fill={theme.reportsGray}
                fillOpacity={0.2}
              />
            </AreaChart>
          </div>
        )
      }
    </Container>
  );
}
