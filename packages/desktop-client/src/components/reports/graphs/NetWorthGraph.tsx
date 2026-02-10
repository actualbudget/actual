// @ts-strict-ignore
import React, { useId, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import { getDay, parse } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

import { computePadding } from './util/computePadding';

import { FinancialText } from '@desktop-client/components/FinancialText';
import {
  getColorScale,
  useRechartsAnimation,
} from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { numberFormatterTooltip } from '@desktop-client/components/reports/numberFormatter';
import { useFormat } from '@desktop-client/hooks/useFormat';
import type { UseFormatResult } from '@desktop-client/hooks/useFormat';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

type NetWorthDataPoint = {
  x: string;
  y: number;
  assets: string;
  debt: string;
  change: string;
  networth: string;
  date: string;
} & Record<string, string | number>;

type TrendTooltipProps = TooltipContentProps<number, string> & {
  style?: CSSProperties;
};

function TrendTooltip({ active, payload, style }: TrendTooltipProps) {
  const { t } = useTranslation();

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
              right={<FinancialText>{payload[0].payload.assets}</FinancialText>}
            />
            <AlignedText
              left={t('Debt:')}
              right={<FinancialText>{payload[0].payload.debt}</FinancialText>}
            />
            <AlignedText
              left={t('Net worth:')}
              right={
                <FinancialText as="strong">
                  {payload[0].payload.networth}
                </FinancialText>
              }
            />
            <AlignedText
              left={t('Change:')}
              right={<FinancialText>{payload[0].payload.change}</FinancialText>}
            />
          </div>
        </div>
      </div>
    );
  }
  return null;
}

type StackedTooltipProps = TooltipContentProps<number, string> & {
  sortedAccounts: Array<{ id: string; name: string }>;
  accounts: Array<{ id: string; name: string }>;
  hoveredAccountId: string | null;
  format: UseFormatResult;
};

function StackedTooltip({
  active,
  payload,
  sortedAccounts,
  accounts,
  hoveredAccountId,
  format,
}: StackedTooltipProps) {
  if (active && payload && payload.length) {
    // Calculate total from payload (visible accounts)
    const total = payload.reduce(
      (acc: number, p) => acc + (Number(p.value) || 0),
      0,
    );
    const sortedPayload = [...payload].sort((a, b) => {
      const indexA = sortedAccounts.findIndex(acc => acc.id === a.dataKey);
      const indexB = sortedAccounts.findIndex(acc => acc.id === b.dataKey);
      return indexB - indexA;
    });

    const hasPositive = payload.some(p => (Number(p.value) || 0) > 0);
    const hasNegative = payload.some(p => (Number(p.value) || 0) < 0);
    const showPercentage = !(hasPositive && hasNegative);

    return (
      <div
        className={css([
          {
            zIndex: 1000,
            pointerEvents: 'auto',
            borderRadius: 2,
            boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
            backgroundColor: theme.menuBackground,
            color: theme.menuItemText,
            padding: 10,
            fontSize: 12,
            maxHeight: '80vh',
            overflowY: 'auto',
          },
        ])}
      >
        <div style={{ marginBottom: 10, fontWeight: 'bold' }}>
          {payload[0].payload.date}
        </div>
        <table style={{ borderSpacing: '15px 0', marginLeft: '-15px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: 15 }}>
                <Trans>Account</Trans>
              </th>
              <th style={{ textAlign: 'right' }}>
                <Trans>Value</Trans>
              </th>
              {showPercentage && <th style={{ textAlign: 'right' }}>%</th>}
            </tr>
          </thead>
          <tbody>
            {sortedPayload.map(entry => {
              const accountId = entry.dataKey as string;
              const accountName =
                accounts.find(a => a.id === accountId)?.name || accountId;
              const value = Number(entry.value);
              const percent = total !== 0 ? (value / total) * 100 : 0;

              return (
                <tr key={accountId} style={{ color: entry.color }}>
                  <td
                    style={{
                      textAlign: 'left',
                      paddingLeft: 15,
                      textDecoration:
                        hoveredAccountId === accountId
                          ? 'underline'
                          : undefined,
                    }}
                  >
                    {accountName}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: theme.pageText }}>
                      <FinancialText>
                        {format(value, 'financial')}
                      </FinancialText>
                    </span>
                  </td>
                  {showPercentage && (
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ color: theme.pageText }}>
                        <FinancialText>{percent.toFixed(1)}%</FinancialText>
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
            <tr
              style={{
                fontWeight: 'bold',
                borderTop: '1px solid ' + theme.tableBorder,
              }}
            >
              <td style={{ textAlign: 'left', paddingLeft: 15, paddingTop: 5 }}>
                <Trans>Total</Trans>
              </td>
              <td style={{ textAlign: 'right', paddingTop: 5 }}>
                <FinancialText>{format(total, 'financial')}</FinancialText>
              </td>
              {showPercentage && (
                <td style={{ textAlign: 'right', paddingTop: 5 }}>100.0%</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

type NetWorthGraphProps = {
  style?: CSSProperties;
  graphData: {
    data: Array<NetWorthDataPoint>;
    hasNegative: boolean;
    start: string;
    end: string;
  };
  accounts?: Array<{ id: string; name: string }>;
  compact?: boolean;
  showTooltip?: boolean;
  interval?: string;
  mode?: 'trend' | 'stacked';
};

export function NetWorthGraph({
  style,
  graphData,
  accounts = [],
  compact = false,
  showTooltip = true,
  interval = 'Monthly',
  mode = 'trend',
}: NetWorthGraphProps) {
  const privacyMode = usePrivacyMode();
  const id = useId();
  const format = useFormat();
  const animationProps = useRechartsAnimation({ isAnimationActive: false });
  const [isTooltipActive, setIsTooltipActive] = useState(false);
  const [hoveredAccountId, setHoveredAccountId] = useState<string | null>(null);

  const { isNarrowWidth } = useResponsive();
  const effectiveShowTooltip = showTooltip && !isNarrowWidth;

  // Use more aggressive smoothening for high-frequency data
  const interpolationType =
    interval === 'Daily' || interval === 'Weekly' ? 'basis' : 'monotone';

  const tickFormatter = (tick: number) => {
    const res = privacyMode
      ? '...'
      : `${format(Math.round(tick), 'financial-no-decimals')}`;

    return res;
  };

  // Trend Mode Logic
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

  // Stacked Mode Logic
  // Sort accounts by total value (smallest to largest)
  const sortedAccounts = useMemo(() => {
    if (!accounts || mode !== 'stacked') return [];

    const totals = accounts.reduce(
      (acc, account) => {
        acc[account.id] = graphData.data.reduce((sum, point) => {
          return sum + (Number(point[account.id]) || 0);
        }, 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    return [...accounts].sort((a, b) => {
      return totals[a.id] - totals[b.id];
    });
  }, [accounts, graphData.data, mode]);

  // Assign colors to accounts
  const colors = useMemo(() => {
    if (mode !== 'stacked') return {};
    const scale = getColorScale('qualitative');
    return sortedAccounts.reduce(
      (acc, account, index) => {
        acc[account.id] = scale[index % scale.length];
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [sortedAccounts, mode]);

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

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
        position: 'relative',
      }}
    >
      {(width, height) =>
        graphData && (
          <div
            style={{
              ...(!compact && { marginTop: '15px' }),
              position: 'relative',
            }}
            onMouseLeave={() => {
              setIsTooltipActive(false);
              setHoveredAccountId(null);
            }}
          >
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
              onMouseMove={() =>
                effectiveShowTooltip &&
                !isTooltipActive &&
                setIsTooltipActive(true)
              }
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
                dataKey={mode === 'trend' ? 'y' : undefined}
                domain={mode === 'trend' ? ['auto', 'auto'] : undefined}
                hide={compact}
                tickFormatter={tickFormatter}
                tick={{ fill: theme.pageText }}
                tickLine={{ stroke: theme.pageText }}
              />
              {effectiveShowTooltip && mode === 'trend' && (
                <Tooltip<number, string>
                  content={props => <TrendTooltip {...props} style={style} />}
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
              )}
              {effectiveShowTooltip && mode === 'stacked' && (
                <Tooltip<number, string>
                  content={props => (
                    <StackedTooltip
                      {...props}
                      sortedAccounts={sortedAccounts}
                      accounts={accounts}
                      hoveredAccountId={hoveredAccountId}
                      format={format}
                    />
                  )}
                  isAnimationActive={false}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                />
              )}

              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset={off}
                    stopColor={theme.reportsChartFill}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset={off}
                    stopColor={theme.reportsNumberNegative}
                    stopOpacity={0.2}
                  />
                </linearGradient>
              </defs>

              {mode === 'trend' ? (
                <Area
                  type={interpolationType}
                  dot={false}
                  activeDot={false}
                  {...animationProps}
                  dataKey="y"
                  stroke={theme.reportsChartFill}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  fillOpacity={1}
                  connectNulls
                />
              ) : (
                sortedAccounts.map(account => (
                  <Area
                    key={account.id}
                    type={interpolationType}
                    dataKey={account.id}
                    stackId="1"
                    stroke={colors[account.id]}
                    fill={colors[account.id]}
                    fillOpacity={0.5}
                    strokeWidth={2}
                    {...animationProps}
                    connectNulls
                    onMouseEnter={() => setHoveredAccountId(account.id)}
                    onMouseLeave={() => setHoveredAccountId(null)}
                  />
                ))
              )}
            </AreaChart>
          </div>
        )
      }
    </Container>
  );
}
