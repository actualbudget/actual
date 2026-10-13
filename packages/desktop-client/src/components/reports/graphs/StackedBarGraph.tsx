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
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BarShapeProps } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import {
  isBaselineKey,
  isIntervalInProgress,
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
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

type PayloadItem = {
  name: string;
  value: number;
  color: string;
  payload: {
    baseline?: BaselineBreakdown;
    name: string;
    color: number | string;
  };
};

type CustomTooltipProps = {
  compact: boolean;
  tooltip: string;
  legend: LegendEntity[];
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
  format: (value: unknown, type: FormatType) => string;
  balanceTypeOp: balanceTypeOpType;
};

const CustomTooltip = ({
  compact,
  tooltip,
  legend,
  active,
  payload,
  label,
  format,
  balanceTypeOp,
}: CustomTooltipProps) => {
  const { t } = useTranslation();
  // Offset intervals carry what their whole-interval change was built from
  const interval = payload?.[0]?.payload;

  const dataKeyToName = useMemo(() => {
    return new Map(legend.map(entry => [entry.dataKey, entry.name]));
  }, [legend]);

  const { sumTotals, items } = useMemo(() => {
    // Intervals that haven't started have no amount to list, and the
    // baseline is summed up below
    return (payload ?? [])
      .filter(item => item.value != null && !isBaselineKey(item.name))
      .reverse()
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

  const maxTooltipItems = 5;

  const nonZeroItems = useMemo(() => {
    return items.filter(p => p.value !== 0);
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!compact || nonZeroItems.length <= maxTooltipItems) return nonZeroItems;

    const hoveredIndex = nonZeroItems.findIndex(p => tooltip === p.name);
    if (hoveredIndex >= maxTooltipItems) {
      return [
        ...nonZeroItems.slice(0, maxTooltipItems - 1),
        nonZeroItems[hoveredIndex],
      ];
    }
    return nonZeroItems.slice(0, maxTooltipItems);
  }, [compact, nonZeroItems, tooltip]);

  // Intervals that haven't started still show their baseline
  if (active && (items.length || interval?.baseline?.upcoming)) {
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
            <strong>{label}</strong>
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {visibleItems.map(pay => {
              const displayName = dataKeyToName.get(pay.name) ?? pay.name;
              return (
                <AlignedText
                  key={pay.name}
                  left={displayName}
                  right={
                    <FinancialText>
                      {format(pay.value, 'financial')}
                    </FinancialText>
                  }
                  style={{
                    color: pay.color,
                    textDecoration:
                      tooltip === pay.name ? 'underline' : 'inherit',
                  }}
                />
              );
            })}
            {compact && nonZeroItems.length > visibleItems.length && '...'}
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

const customLabel = props => {
  const calcX = props.x + props.width / 2;
  const calcY = props.y + props.height / 2;
  const textAnchor = 'middle';
  const display =
    props.value && `${props.format(props.value, 'financial-no-decimals')}`;
  const textSize = '12px';
  const showLabel = props.height;
  const showLabelThreshold = 20;
  const fill = theme.reportsInnerLabel;

  return renderCustomLabel(
    calcX,
    calcY,
    textAnchor,
    display,
    textSize,
    showLabel,
    showLabelThreshold,
    fill,
  );
};

type StackedBarGraphProps = {
  style?: CSSProperties;
  data: DataEntity;
  filters: RuleConditionEntity[];
  groupBy: string;
  compact?: boolean;
  viewLabels: boolean;
  balanceTypeOp: balanceTypeOpType;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showTooltip?: boolean;
  interval?: string;
  showAmounts?: boolean;
};

export function StackedBarGraph({
  style,
  data,
  filters,
  groupBy,
  compact,
  viewLabels,
  balanceTypeOp,
  showHiddenCategories,
  showOffBudget,
  showTooltip = true,
  interval,
  showAmounts = false,
}: StackedBarGraphProps) {
  const animationProps = useRechartsAnimation();
  const navigate = useNavigate();
  const { data: categories = { grouped: [], list: [] } } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  const customLabelWithFormat = props => customLabel({ ...props, format });

  const [pointer, setPointer] = useState('');
  const [tooltip, setTooltip] = useState('');

  // Amounts against a baseline stack in front of a faint bar for the whole
  // interval's baseline
  const isAmounts = showAmounts && !!data.baseline;

  const largestValue = data.intervalData
    .flatMap(c =>
      isAmounts ? [c.amount ?? 0, c.baselineAmount ?? 0] : [c[balanceTypeOp]],
    )
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 0;

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) => {
        // The baseline and the stack share a slot, overlapped by a negative
        // gap, and the baseline draws itself wider so it shows around the
        // stack
        const barSize = isAmounts
          ? (width / Math.max(data.intervalData.length, 1)) * 0.45
          : undefined;

        return (
          data.intervalData && (
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <BarChart
                width={width}
                height={height}
                data={data.intervalData}
                margin={{ top: 0, right: 0, left: leftMargin, bottom: 10 }}
                style={{ cursor: pointer }}
                stackOffset="sign" //stacked by sign
                barSize={barSize}
                barGap={isAmounts ? -barSize : undefined}
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
                    cursor={{ fill: 'transparent' }}
                  />
                )}
                <XAxis
                  dataKey="date"
                  tick={{ fill: theme.pageText }}
                  tickLine={{ stroke: theme.pageText }}
                />
                {!compact && <CartesianGrid strokeDasharray="3 3" />}
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
                {isAmounts && (
                  <Bar
                    dataKey="baselineAmount"
                    tooltipType="none"
                    legendType="none"
                    isAnimationActive={false}
                    shape={(props: BarShapeProps) => (
                      <Rectangle
                        x={props.x - props.width * 0.4}
                        y={props.y}
                        width={props.width * 1.8}
                        height={props.height}
                        fill={theme.pageTextLight}
                        fillOpacity={0.3}
                      />
                    )}
                  />
                )}
                {data.legend
                  .slice(0)
                  .reverse()
                  .map(entry => (
                    <Bar
                      key={entry.dataKey}
                      dataKey={entry.dataKey}
                      stackId="a"
                      fill={entry.color}
                      // An interval in progress is faded, since its amount
                      // is only part of what it will be
                      shape={(props: BarShapeProps) => (
                        <Rectangle
                          {...props}
                          fillOpacity={
                            data.baseline && isIntervalInProgress(props.payload)
                              ? 0.5
                              : 1
                          }
                        />
                      )}
                      {...animationProps}
                      onMouseLeave={() => {
                        setPointer('');
                        setTooltip('');
                      }}
                      onMouseEnter={() => {
                        setTooltip(entry.dataKey);
                        if (groupBy !== 'Interval') {
                          setPointer('pointer');
                        }
                      }}
                      onClick={e =>
                        ((compact && showTooltip) || !compact) &&
                        groupBy !== 'Interval' &&
                        showActivity({
                          navigate,
                          categories,
                          accounts,
                          balanceTypeOp,
                          filters,
                          showHiddenCategories,
                          showOffBudget,
                          type: 'time',
                          startDate: e.payload?.intervalStartDate,
                          endDate: e.payload?.intervalEndDate,
                          field: groupBy.toLowerCase(),
                          id: entry.id,
                          uncategorizedId: entry.uncategorizedId,
                          bucketTagNames: entry.bucketTagNames,
                          scopeTagNames: data.scopeTagNames,
                          interval,
                        })
                      }
                    >
                      {viewLabels && !compact && (
                        <LabelList
                          dataKey={entry.dataKey}
                          content={customLabelWithFormat}
                        />
                      )}
                    </Bar>
                  ))}
              </BarChart>
            </div>
          )
        );
      }}
    </Container>
  );
}
