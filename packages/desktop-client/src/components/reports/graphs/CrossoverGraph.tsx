import { Trans, useTranslation } from 'react-i18next';

import { type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

type CrossoverGraphProps = {
  style?: CSSProperties;
  graphData: {
    data: Array<{
      x: string;
      investmentIncome: number;
      expenses: number;
      isProjection?: boolean;
    }>;
    start: string;
    end: string;
    crossoverXLabel?: string | null;
  };
  compact?: boolean;
  showTooltip?: boolean;
};

export function CrossoverGraph({
  style,
  graphData,
  compact = false,
  showTooltip = true,
}: CrossoverGraphProps) {
  const { t } = useTranslation();
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const animationProps = useRechartsAnimation({ isAnimationActive: false });

  const tickFormatter = (tick: number) => {
    if (privacyMode) {
      return '...';
    }
    return `${format(Math.round(tick), 'financial-no-decimals')}`;
  };

  type PayloadItem = {
    payload: {
      x: string;
      investmentIncome: number | string;
      expenses: number | string;
      isProjection?: boolean;
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
              <strong>{payload[0].payload.x}</strong>
              {payload[0].payload.isProjection ? (
                <span style={{ marginLeft: 8, opacity: 0.7 }}>
                  {t('(projected)')}
                </span>
              ) : null}
            </div>
            <div style={{ lineHeight: 1.5 }}>
              <View
                className={css({
                  display: 'flex',
                  justifyContent: 'space-between',
                })}
              >
                <div>
                  <Trans>Monthly investment income:</Trans>
                </div>
                <div>
                  {format(payload[0].payload.investmentIncome, 'financial')}
                </div>
              </View>
              <View
                className={css({
                  display: 'flex',
                  justifyContent: 'space-between',
                })}
              >
                <div>
                  <Trans>Monthly expenses:</Trans>
                </div>
                <div>{format(payload[0].payload.expenses, 'financial')}</div>
              </View>
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
      {(width, height) => (
        <ResponsiveContainer>
          <div style={{ ...(!compact && { marginTop: '15px' }) }}>
            <LineChart
              width={width}
              height={height}
              data={graphData.data}
              margin={{
                top: 0,
                right: 0,
                left: compact ? 0 : 20,
                bottom: compact ? 0 : 10,
              }}
            >
              {!compact && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey="x"
                hide={compact}
                tick={{ fill: theme.pageText }}
                tickLine={{ stroke: theme.pageText }}
              />
              <YAxis
                hide={compact}
                tickFormatter={tickFormatter}
                tick={{ fill: theme.pageText }}
                tickLine={{ stroke: theme.pageText }}
              />
              {showTooltip && (
                <Tooltip
                  content={<CustomTooltip />}
                  isAnimationActive={false}
                />
              )}
              {graphData.crossoverXLabel && (
                <ReferenceLine
                  x={graphData.crossoverXLabel}
                  stroke={theme.noticeText}
                  strokeDasharray="4 4"
                />
              )}
              <Line
                type="monotone"
                dataKey="investmentIncome"
                dot={false}
                stroke={theme.reportsBlue}
                strokeWidth={2}
                {...animationProps}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                dot={false}
                stroke={theme.reportsRed}
                strokeWidth={2}
                {...animationProps}
              />
            </LineChart>
          </div>
        </ResponsiveContainer>
      )}
    </Container>
  );
}
