import { useId } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

type PayloadItem = {
  payload: {
    date: string;
    ageOfMoney: number;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
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
        <div style={{ marginBottom: 5 }}>
          <strong>{payload[0].payload.date}</strong>
        </div>
        <div>
          {t('Age of Money: {{days}} days', {
            days: payload[0].payload.ageOfMoney,
          })}
        </div>
      </div>
    );
  }
  return null;
}

type AgeOfMoneyGraphProps = {
  style?: CSSProperties;
  data: Array<{
    date: string;
    ageOfMoney: number;
  }>;
  compact?: boolean;
  showTooltip?: boolean;
};

export function AgeOfMoneyGraph({
  style,
  data,
  compact = false,
  showTooltip = true,
}: AgeOfMoneyGraphProps) {
  const { t } = useTranslation();
  const animationProps = useRechartsAnimation();
  const privacyMode = usePrivacyMode();
  const id = useId();
  const gradientId = `aom-gradient-${id}`;

  // Calculate the maximum value for Y axis scaling
  const maxAge = Math.max(...data.map(d => d.ageOfMoney), 30);
  const yAxisMax = Math.ceil(maxAge / 10) * 10 + 10;

  // 30 days approximates "living on last month's income"
  // This value is used as a marked reference value on the graph.
  const targetReferenceAge = 30;

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data && data.length > 0 ? (
          <div>
            {!compact && <div style={{ marginTop: '15px' }} />}
            <AreaChart
              width={width}
              height={height}
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: compact ? 0 : 10,
                bottom: 10,
              }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={theme.reportsBlue}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={theme.reportsBlue}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              {!compact && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme.tableRowHeaderBackground}
                  vertical={false}
                />
              )}
              {!compact && (
                <XAxis
                  dataKey="date"
                  tick={{ fill: theme.pageText, fontSize: 12 }}
                  tickLine={{ stroke: theme.pageText }}
                  axisLine={{ stroke: theme.tableRowHeaderBackground }}
                />
              )}
              {!compact && (
                <YAxis
                  tickFormatter={value => (privacyMode ? '•••' : `${value}d`)}
                  tick={{ fill: theme.pageText, fontSize: 12 }}
                  tickLine={{ stroke: theme.pageText }}
                  axisLine={{ stroke: theme.tableRowHeaderBackground }}
                  domain={[0, yAxisMax]}
                />
              )}
              {showTooltip && (
                <Tooltip
                  content={<CustomTooltip />}
                  isAnimationActive={false}
                />
              )}
              {!compact && (
                <ReferenceLine
                  y={targetReferenceAge}
                  stroke={theme.noticeTextLight}
                  strokeDasharray="5 5"
                  label={{
                    value: t('30 days'),
                    position: 'insideTopRight',
                    fill: theme.noticeTextLight,
                    fontSize: 10,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="ageOfMoney"
                stroke={theme.reportsBlue}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                dot={!compact && data.length <= 90}
                activeDot={{ r: 6, fill: theme.reportsBlue }}
                {...animationProps}
              />
            </AreaChart>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: theme.pageTextSubdued,
            }}
          >
            <Trans>No data available</Trans>
          </div>
        )
      }
    </Container>
  );
}
