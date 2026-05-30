// @ts-strict-ignore
import React, { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  DataEntity,
  LegendEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { getCustomTick } from '#components/reports/getCustomTick';
import { numberFormatterTooltip } from '#components/reports/numberFormatter';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

import { showActivity } from './showActivity';

type PayloadItem = {
  dataKey: string;
  value: number;
  date: string;
  color: string;
  payload: {
    date: string;
  };
};

type CustomTooltipProps = {
  compact: boolean;
  tooltip: string;
  legend: LegendEntity[];
  active?: boolean;
  payload?: PayloadItem[];
  format: (value: unknown, type: FormatType) => string;
};

const CustomTooltip = ({
  compact,
  tooltip,
  legend,
  active,
  payload,
  format,
}: CustomTooltipProps) => {
  const { t } = useTranslation();

  const dataKeyToName = useMemo(() => {
    return new Map(legend.map(entry => [entry.dataKey, entry.name]));
  }, [legend]);

  const { sumTotals, items } = useMemo(() => {
    return (payload ?? [])
      .sort((p1: PayloadItem, p2: PayloadItem) => p2.value - p1.value)
      .reduce(
        (acc, item) => {
          acc.sumTotals += item.value;
          acc.items.push(item);
          return acc;
        },
        {
          sumTotals: 0,
          items: [] as PayloadItem[],
        },
      );
  }, [payload]);

  if (active && items.length) {
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
            {items.map((p: PayloadItem, index: number) => {
              const displayName = dataKeyToName.get(p.dataKey) ?? p.dataKey;
              return (
                (compact ? index < 4 : true) && (
                  <AlignedText
                    key={index}
                    left={displayName}
                    right={
                      <FinancialText>
                        {format(p.value, 'financial')}
                      </FinancialText>
                    }
                    style={{
                      color: p.color,
                      textDecoration:
                        tooltip === p.dataKey ? 'underline' : 'inherit',
                    }}
                  />
                )
              );
            })}
            {payload.length > 5 && compact && '...'}
            <AlignedText
              left={t('Total')}
              right={
                <FinancialText>{format(sumTotals, 'financial')}</FinancialText>
              }
              style={{
                fontWeight: 600,
              }}
            />
          </div>
        </div>
      </div>
    );
  }
};

type LineGraphProps = {
  style?: CSSProperties;
  data: DataEntity;
  filters: RuleConditionEntity[];
  groupBy: string;
  compact?: boolean;
  balanceTypeOp: balanceTypeOpType;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showTrendLines?: boolean;
  showTooltip?: boolean;
  interval?: string;
};

export function LineGraph({
  style,
  data,
  filters,
  groupBy,
  compact,
  balanceTypeOp,
  showHiddenCategories,
  showOffBudget,
  showTrendLines = false,
  showTooltip = true,
  interval,
}: LineGraphProps) {
  const animationProps = useRechartsAnimation();
  const navigate = useNavigate();
  const { data: categories = { grouped: [], list: [] } } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  const [pointer, setPointer] = useState('');
  const [tooltip, setTooltip] = useState('');

  const largestValue = data.intervalData
    .map(c => c[balanceTypeOp])
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 5;

  const n = data.intervalData.length;
  const trendLines =
    !showTrendLines || n < 2
      ? []
      : data.legend
          .map(entry => {
            let sumX = 0,
              sumY = 0,
              sumXY = 0,
              sumX2 = 0;
            for (let x = 0; x < n; x++) {
              const y = Number(data.intervalData[x][entry.dataKey]) || 0;
              sumX += x;
              sumY += y;
              sumXY += x * y;
              sumX2 += x * x;
            }
            const denom = n * sumX2 - sumX * sumX;
            if (denom === 0) return null;
            const slope = (n * sumXY - sumX * sumY) / denom;
            const intercept = (sumY - slope * sumX) / n;
            return {
              id: entry.id ?? entry.dataKey,
              color: entry.color,
              start: { x: data.intervalData[0].date, y: intercept },
              end: {
                x: data.intervalData[n - 1].date,
                y: intercept + slope * (n - 1),
              },
            };
          })
          .filter(Boolean);

  const onShowActivity = (item, id, payload) => {
    showActivity({
      navigate,
      categories,
      accounts,
      balanceTypeOp,
      filters,
      showHiddenCategories,
      showOffBudget,
      type: 'time',
      startDate: payload.payload.intervalStartDate,
      endDate: payload.payload.intervalEndDate,
      field: groupBy.toLowerCase(),
      id,
      interval,
    });
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
            <LineChart
              responsive
              width={width}
              height={height}
              data={data.intervalData}
              margin={{ top: 10, right: 10, left: leftMargin, bottom: 10 }}
              style={{ cursor: pointer }}
            >
              {showTooltip && (
                <Tooltip
                  content={
                    <CustomTooltip
                      compact={compact}
                      tooltip={tooltip}
                      legend={data.legend}
                      format={format}
                    />
                  }
                  formatter={numberFormatterTooltip}
                  isAnimationActive={false}
                />
              )}
              {!compact && <CartesianGrid strokeDasharray="3 3" />}
              {!compact && (
                <XAxis
                  dataKey="date"
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                />
              )}
              {!compact && (
                <YAxis
                  tickFormatter={value =>
                    getCustomTick(
                      format(value, 'financial-no-decimals'),
                      privacyMode,
                    )
                  }
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                  tickSize={0}
                />
              )}
              {trendLines.map(t => (
                <ReferenceLine
                  key={`trend-${t.id}`}
                  segment={[t.start, t.end]}
                  stroke={t.color}
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  ifOverflow="extendDomain"
                />
              ))}
              {data.legend.map((entry, index) => {
                return (
                  <Line
                    key={index}
                    strokeWidth={2}
                    type="monotone"
                    dataKey={entry.dataKey}
                    stroke={entry.color}
                    {...animationProps}
                    activeDot={{
                      r: entry.dataKey === tooltip && !compact ? 8 : 3,
                      onMouseEnter: () => {
                        setTooltip(entry.dataKey);
                        if (!['Group', 'Interval'].includes(groupBy)) {
                          setPointer('pointer');
                        }
                      },
                      onMouseLeave: () => {
                        setPointer('');
                        setTooltip('');
                      },
                      onClick: (e, payload) =>
                        ((compact && showTooltip) || !compact) &&
                        !['Group', 'Interval'].includes(groupBy) &&
                        onShowActivity(e, entry.id, payload),
                    }}
                  />
                );
              })}
            </LineChart>
          </div>
        )
      }
    </Container>
  );
}
