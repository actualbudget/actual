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
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getBaselineKey } from '#components/reports/baselineRange';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { getCustomTick } from '#components/reports/getCustomTick';
import { numberFormatterTooltip } from '#components/reports/numberFormatter';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

import { SeriesTooltip } from './SeriesTooltip';
import { showActivity } from './showActivity';
import { computeTrendLines } from './util/computeTrendLines';

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
                    <SeriesTooltip
                      compact={compact}
                      balanceTypeOp={balanceTypeOp}
                      hoveredKey={tooltip}
                      legend={data.legend}
                      format={format}
                      order="value"
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
