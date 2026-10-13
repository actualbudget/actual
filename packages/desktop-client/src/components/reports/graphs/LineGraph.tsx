// @ts-strict-ignore
import React, { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  BaselineBreakdown,
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
import {
  getBaselineKey,
  getSeriesKey,
  isBaselineKey,
} from '#components/reports/baselineRange';
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

import { BaselineTooltipLines } from './BaselineTooltip';
import { showActivity } from './showActivity';
import { computeTrendLines } from './util/computeTrendLines';

type PayloadItem = {
  dataKey: string;
  value: number;
  date: string;
  color: string;
  payload: {
    baseline?: BaselineBreakdown;
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
  balanceTypeOp: balanceTypeOpType;
};

const CustomTooltip = ({
  compact,
  tooltip,
  legend,
  active,
  payload,
  format,
  balanceTypeOp,
}: CustomTooltipProps) => {
  const { t } = useTranslation();
  // Offset intervals carry what their whole-interval change was built from
  const interval = payload?.[0]?.payload;

  const dataKeyToName = useMemo(() => {
    return new Map(legend.map(entry => [entry.dataKey, entry.name]));
  }, [legend]);

  // Intervals that haven't started list each series' baseline instead
  const isUpcoming = !!interval?.baseline?.upcoming;

  const { sumTotals, items } = useMemo(() => {
    return (payload ?? [])
      .filter(
        item =>
          item.value != null && isBaselineKey(item.dataKey) === isUpcoming,
      )
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
  }, [payload, isUpcoming]);

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
              const seriesKey = getSeriesKey(p.dataKey);
              const displayName = dataKeyToName.get(seriesKey) ?? seriesKey;
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
            {/* The baseline's change line replaces the total */}
            {!interval?.baseline && (
              <AlignedText
                left={t('Total')}
                right={
                  <FinancialText>
                    {format(sumTotals, 'financial')}
                  </FinancialText>
                }
                style={{
                  fontWeight: 600,
                }}
              />
            )}
            {interval?.baseline && (
              <div
                style={{
                  marginTop: 5,
                  paddingTop: 5,
                  borderTop: `1px solid ${theme.menuBorder}`,
                }}
              >
                <BaselineTooltipLines
                  breakdown={interval.baseline}
                  balanceTypeOp={balanceTypeOp}
                  format={format}
                />
              </div>
            )}
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
  showAmounts?: boolean;
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
  showAmounts = false,
}: LineGraphProps) {
  const animationProps = useRechartsAnimation();
  const navigate = useNavigate();
  const { data: categories = { grouped: [], list: [] } } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  const [pointer, setPointer] = useState('');
  const [tooltip, setTooltip] = useState('');

  // Amounts against a baseline draw each series beside a faint baseline line
  const isAmounts = showAmounts && !!data.baseline;

  const largestValue = data.intervalData
    .flatMap(c =>
      isAmounts ? [c.amount ?? 0, c.baselineAmount ?? 0] : [c[balanceTypeOp]],
    )
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 5;

  const trendLines = showTrendLines
    ? computeTrendLines(
        data.intervalData,
        data.legend,
        // Budgets are set per interval rather than accrued per day
        balanceTypeOp === 'totalBudgeted' ? undefined : interval,
      )
    : [];

  const onShowActivity = (id, payload, uncategorizedId, bucketTagNames) => {
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
      uncategorizedId,
      bucketTagNames,
      scopeTagNames: data.scopeTagNames,
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
                      balanceTypeOp={balanceTypeOp}
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
              {isAmounts &&
                data.legend.map(entry => (
                  <Line
                    key={getBaselineKey(entry.dataKey)}
                    strokeWidth={2}
                    type="monotone"
                    dataKey={getBaselineKey(entry.dataKey)}
                    stroke={entry.color}
                    strokeOpacity={0.35}
                    dot={false}
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                    {...animationProps}
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
                        if (groupBy !== 'Interval') {
                          setPointer('pointer');
                        }
                      },
                      onMouseLeave: () => {
                        setPointer('');
                        setTooltip('');
                      },
                      onClick: (e, payload) =>
                        ((compact && showTooltip) || !compact) &&
                        groupBy !== 'Interval' &&
                        onShowActivity(
                          entry.id,
                          payload,
                          entry.uncategorizedId,
                          entry.bucketTagNames,
                        ),
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
