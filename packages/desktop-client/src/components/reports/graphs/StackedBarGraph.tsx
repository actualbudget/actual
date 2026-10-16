// @ts-strict-ignore
import React, { useState } from 'react';
import type { CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  DataEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
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

import { isIntervalInProgress } from '#components/reports/baselineRange';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { getCustomTick } from '#components/reports/getCustomTick';
import { numberFormatterTooltip } from '#components/reports/numberFormatter';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

import { renderCustomLabel } from './renderCustomLabel';
import { SeriesTooltip } from './SeriesTooltip';
import { showActivity } from './showActivity';

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
                      <SeriesTooltip
                        compact={compact}
                        balanceTypeOp={balanceTypeOp}
                        hoveredKey={tooltip}
                        legend={data.legend}
                        format={format}
                        order="stack"
                        hideZero
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
