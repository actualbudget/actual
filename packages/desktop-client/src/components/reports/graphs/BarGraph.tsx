// @ts-strict-ignore
import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  ComparisonBreakdown,
  DataEntity,
  GroupedEntity,
  IntervalEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BarShapeProps } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import {
  getComparisonDrilldownDates,
  isIntervalInProgress,
} from '#components/reports/comparisonRange';
import { Container } from '#components/reports/Container';
import { getCustomTick } from '#components/reports/getCustomTick';
import { numberFormatterTooltip } from '#components/reports/numberFormatter';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

import { adjustTextSize } from './adjustTextSize';
import { ComparisonBar } from './ComparisonBar';
import { ComparisonTooltip } from './ComparisonTooltip';
import { getSpendingSign } from './getSpendingSign';
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';
import { TooltipCard } from './TooltipCard';

type PayloadChild = {
  props: {
    name: string;
    fill: string;
  };
};

type PayloadItem = {
  payload: {
    name: string;
    comparison?: ComparisonBreakdown;
    comparisonStartDate?: string;
    comparisonEndDate?: string;
    totalAssets: number;
    totalDebts: number;
    netAssets: number;
    netDebts: number;
    totalTotals: number;
    totalBudgeted: number;
    networth: number;
    totalChange: number;
    children: [PayloadChild];
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  balanceTypeOp?: balanceTypeOpType;
  yAxis?: string;
  format: (value: unknown, type: FormatType) => string;
};

const CustomTooltip = ({
  active,
  payload,
  balanceTypeOp,
  yAxis,
  format,
}: CustomTooltipProps) => {
  const { t } = useTranslation();

  const row = payload?.[0]?.payload;
  if (active && row?.comparison) {
    return (
      <ComparisonTooltip
        title={row[yAxis]}
        breakdown={row.comparison}
        balanceTypeOp={balanceTypeOp}
        format={format}
        // Interval bars carry their own window; category bars cover them all
        comparisonStartDate={row.comparisonStartDate}
        comparisonEndDate={row.comparisonEndDate}
      />
    );
  }

  if (active && payload && payload.length) {
    return (
      <TooltipCard title={payload[0].payload[yAxis]}>
        {['totalAssets', 'totalTotals', 'totalBudgeted'].includes(
          balanceTypeOp,
        ) && (
          <AlignedText
            left={t('Assets:')}
            right={
              <FinancialText>
                {format(payload[0].payload.totalAssets, 'financial')}
              </FinancialText>
            }
          />
        )}
        {['totalDebts', 'totalTotals', 'totalBudgeted'].includes(
          balanceTypeOp,
        ) && (
          <AlignedText
            left={t('Debts:')}
            right={
              <FinancialText>
                {format(payload[0].payload.totalDebts, 'financial')}
              </FinancialText>
            }
          />
        )}
        {['netAssets'].includes(balanceTypeOp) && (
          <AlignedText
            left={t('Net Assets:')}
            right={
              <FinancialText>
                {format(payload[0].payload.netAssets, 'financial')}
              </FinancialText>
            }
          />
        )}
        {['netDebts'].includes(balanceTypeOp) && (
          <AlignedText
            left={t('Net Debts:')}
            right={
              <FinancialText>
                {format(payload[0].payload.netDebts, 'financial')}
              </FinancialText>
            }
          />
        )}
        {['totalTotals', 'totalBudgeted'].includes(balanceTypeOp) && (
          <AlignedText
            left={
              balanceTypeOp === 'totalBudgeted' ? t('Budgeted:') : t('Net:')
            }
            right={
              <FinancialText as="strong">
                {format(
                  balanceTypeOp === 'totalBudgeted'
                    ? payload[0].payload.totalBudgeted
                    : payload[0].payload.totalTotals,
                  'financial',
                )}
              </FinancialText>
            }
          />
        )}
      </TooltipCard>
    );
  }
};

// Comparison bars label their change above the bar, whichever way it goes,
// with spending's change flipped to match the bar's positive amounts
const customLabel = (props, typeOp, format, isAbove = false) => {
  const calcX = props.x + props.width / 2;
  const calcY = props.y - (isAbove || props.value > 0 ? 15 : -15);
  const textAnchor = 'middle';
  const shown = isAbove ? getSpendingSign(typeOp) * props.value : props.value;
  const display =
    props.value !== 0 && `${format(shown, 'financial-no-decimals')}`;
  const textSize = adjustTextSize({
    sized: props.width,
    type:
      typeOp === 'totalTotals' || typeOp === 'totalBudgeted'
        ? 'default'
        : 'variable',
    values: props.value,
  });

  return renderCustomLabel(calcX, calcY, textAnchor, display, textSize);
};

type ReportDrilldownPayload = Pick<GroupedEntity, 'uncategorizedId'>;

function hasUncategorizedId(value: unknown): value is ReportDrilldownPayload {
  return (
    value !== null && typeof value === 'object' && 'uncategorizedId' in value
  );
}

// Recharts types the bar's payload as `any`, so check it holds interval dates
type IntervalDrilldownPayload = Pick<
  IntervalEntity,
  'intervalStartDate' | 'intervalEndDate'
>;

function hasIntervalDates(value: unknown): value is IntervalDrilldownPayload {
  return (
    value !== null && typeof value === 'object' && 'intervalStartDate' in value
  );
}

type BarGraphProps = {
  style?: CSSProperties;
  data: DataEntity;
  filters: RuleConditionEntity[];
  groupBy: string;
  balanceTypeOp: balanceTypeOpType;
  compact?: boolean;
  viewLabels: boolean;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showTooltip?: boolean;
  showAmounts?: boolean;
};

export function BarGraph({
  style,
  data,
  filters,
  groupBy,
  balanceTypeOp,
  compact,
  viewLabels,
  showHiddenCategories,
  showOffBudget,
  showTooltip = true,
  showAmounts = false,
}: BarGraphProps) {
  const animationProps = useRechartsAnimation();
  const navigate = useNavigate();
  const { data: categories = { grouped: [], list: [] } } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  const [pointer, setPointer] = useState('');

  const canShowActivity = !compact || showTooltip;
  // Interval bars drill down by their own date range instead of a field
  const getDrilldown = (payload: unknown, id: string | undefined) => {
    const intervalPayload = hasIntervalDates(payload) ? payload : undefined;
    const itemPayload = hasUncategorizedId(payload) ? payload : undefined;
    return groupBy === 'Interval'
      ? {
          startDate: intervalPayload?.intervalStartDate ?? data.startDate,
          endDate: intervalPayload?.intervalEndDate ?? data.endDate,
        }
      : {
          startDate: data.startDate,
          endDate: data.endDate,
          field: groupBy.toLowerCase(),
          id,
          uncategorizedId: itemPayload?.uncategorizedId,
        };
  };
  const showTotals = (
    drilldown: ReturnType<typeof getDrilldown>,
    bucketTagNames: string[] | undefined,
  ) =>
    showActivity({
      navigate,
      categories,
      accounts,
      balanceTypeOp,
      filters,
      showHiddenCategories,
      showOffBudget,
      type: 'totals',
      ...drilldown,
      bucketTagNames,
      scopeTagNames: data.scopeTagNames,
    });

  const yAxis = groupBy === 'Interval' ? 'date' : 'name';
  const splitData = groupBy === 'Interval' ? 'intervalData' : 'data';
  const labelsMargin = viewLabels ? 30 : 0;

  const getVal = obj => {
    // Spending is flipped so it points up, but comparison changes are already
    // signed and point the same way as their numbers
    if (
      !data.comparison &&
      ['totalDebts', 'netDebts'].includes(balanceTypeOp)
    ) {
      return -1 * obj[balanceTypeOp];
    }

    return obj[balanceTypeOp];
  };

  // Comparison bars show amounts rather than changes, so spending is flipped to
  // point up like other spending charts
  const isComparisonBars = showAmounts && !!data.comparison;
  const sign = getSpendingSign(balanceTypeOp);
  const getComparisonValues = (breakdown: ComparisonBreakdown) => ({
    comparison: sign * breakdown.expected[balanceTypeOp],
    amount: sign * (breakdown.projected ?? breakdown.actual)[balanceTypeOp],
  });

  // Comparison bars span everything drawn in them, so their shape can place
  // each part along the same scale
  const getComparisonRange = (
    breakdown: ComparisonBreakdown,
  ): [number, number] => {
    const { comparison, amount } = getComparisonValues(breakdown);
    return [Math.min(0, comparison, amount), Math.max(0, comparison, amount)];
  };

  const getBarValue = (obj: GroupedEntity | IntervalEntity) =>
    isComparisonBars && obj.comparison
      ? getComparisonRange(obj.comparison)
      : getVal(obj);

  const longestLabelLength = data[splitData]
    .map(c => c[yAxis])
    .reduce((acc, cur) => (cur.length > acc ? cur.length : acc), 0);

  const largestValue = data[splitData]
    .flatMap(c => getBarValue(c))
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 0;

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data[splitData] && (
          <div>
            {!compact && <div style={{ marginTop: '15px' }} />}
            <BarChart<GroupedEntity | IntervalEntity>
              responsive
              width={width}
              height={height}
              stackOffset="sign"
              data={data[splitData]}
              style={{ cursor: pointer }}
              margin={{
                top: labelsMargin,
                right: 0,
                left: leftMargin,
                bottom: 0,
              }}
            >
              {showTooltip && (
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={
                    <CustomTooltip
                      balanceTypeOp={balanceTypeOp}
                      yAxis={yAxis}
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
                  dataKey={yAxis}
                  angle={-35}
                  height={Math.sqrt(longestLabelLength) * 25}
                  tick={{ fill: theme.pageText, textAnchor: 'end' }}
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
              {!compact && <ReferenceLine y={0} stroke={theme.pageTextLight} />}
              <Bar
                dataKey={getBarValue}
                // Recharts can't stack range bars
                stackId={isComparisonBars ? undefined : 'a'}
                {...animationProps}
                onMouseLeave={() => setPointer('')}
                onMouseEnter={() => setPointer('pointer')}
                onClick={item => {
                  if (canShowActivity) {
                    showTotals(
                      getDrilldown(item.payload, item.id),
                      item.payload.bucketTagNames,
                    );
                  }
                }}
                shape={(props: BarShapeProps) => {
                  const fill =
                    data.legend[props.index]?.color ?? props.fill ?? undefined;
                  const breakdown = props.payload?.comparison;
                  // An interval in progress is faded, since its amount is
                  // only part of what it will be
                  const opacity =
                    breakdown && isIntervalInProgress(props.payload) ? 0.5 : 1;
                  if (isComparisonBars && breakdown) {
                    const comparisonDates = getComparisonDrilldownDates(
                      data,
                      breakdown,
                      groupBy === 'Interval' ? props.payload : undefined,
                    );
                    return (
                      <ComparisonBar
                        opacity={opacity}
                        x={props.x}
                        y={props.y}
                        width={props.width}
                        height={props.height}
                        range={getComparisonRange(breakdown)}
                        {...getComparisonValues(breakdown)}
                        fill={fill}
                        onComparisonClick={
                          canShowActivity && comparisonDates
                            ? () =>
                                showTotals(
                                  {
                                    ...getDrilldown(
                                      props.payload,
                                      props.payload?.id,
                                    ),
                                    ...comparisonDates,
                                  },
                                  props.payload?.bucketTagNames,
                                )
                            : undefined
                        }
                      />
                    );
                  }

                  return (
                    <Rectangle {...props} fill={fill} fillOpacity={opacity} />
                  );
                }}
              >
                {viewLabels && !compact && (
                  <LabelList
                    dataKey={val => getVal(val)}
                    content={e =>
                      customLabel(e, balanceTypeOp, format, isComparisonBars)
                    }
                  />
                )}
              </Bar>
            </BarChart>
          </div>
        )
      }
    </Container>
  );
}
