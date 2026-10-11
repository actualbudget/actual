// @ts-strict-ignore
import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  DataEntity,
  GroupedEntity,
  IntervalEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';
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
import { renderCustomLabel } from './renderCustomLabel';
import { showActivity } from './showActivity';

type PayloadChild = {
  props: {
    name: string;
    fill: string;
  };
};

type PayloadItem = {
  payload: {
    name: string;
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
            <strong>{payload[0].payload[yAxis]}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
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
          </div>
        </div>
      </div>
    );
  }
};

const customLabel = (props, typeOp, format) => {
  const calcX = props.x + props.width / 2;
  const calcY = props.y - (props.value > 0 ? 15 : -15);
  const textAnchor = 'middle';
  const display =
    props.value !== 0 && `${format(props.value, 'financial-no-decimals')}`;
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

// Keeps angled category labels from taking over the small card preview
const COMPACT_LABEL_MAX_LENGTH = 12;
// Rough horizontal space an angled tick label takes per character
const ANGLED_LABEL_WIDTH_PER_CHAR = 5;

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
});

// Splits by visible character so emoji like flags and families stay whole
function splitGraphemes(value: string) {
  return Array.from(graphemeSegmenter.segment(value), s => s.segment);
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
}: BarGraphProps) {
  const animationProps = useRechartsAnimation();
  const navigate = useNavigate();
  const { data: categories = { grouped: [], list: [] } } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  const [pointer, setPointer] = useState('');

  const yAxis = groupBy === 'Interval' ? 'date' : 'name';
  const splitData = groupBy === 'Interval' ? 'intervalData' : 'data';
  const labelsMargin = viewLabels ? 30 : 0;

  const getVal = obj => {
    if (['totalDebts', 'netDebts'].includes(balanceTypeOp)) {
      return -1 * obj[balanceTypeOp];
    }

    return obj[balanceTypeOp];
  };

  const formatXTick = (value: string) => {
    // Split by grapheme so emoji like flags and families stay whole
    const chars = splitGraphemes(value);
    return compact && chars.length > COMPACT_LABEL_MAX_LENGTH
      ? `${chars.slice(0, COMPACT_LABEL_MAX_LENGTH - 1).join('')}…`
      : value;
  };

  const getLabelLength = (value: string) =>
    splitGraphemes(formatXTick(value)).length;

  const longestLabelLength = data[splitData]
    .map(c => getLabelLength(c[yAxis]))
    .reduce((acc, cur) => (cur > acc ? cur : acc), 0);

  const largestValue = data[splitData]
    .map(c => c[balanceTypeOp])
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  // Dates fit flat like the stacked bar card; only category names need angling
  const isAngled = !compact || groupBy !== 'Interval';

  const getLeftMargin = () => {
    // Without a Y axis the card has no room for the first angled label to overhang
    const firstLabel = data[splitData][0]?.[yAxis];
    if (compact && isAngled && firstLabel) {
      return getLabelLength(firstLabel) * ANGLED_LABEL_WIDTH_PER_CHAR;
    }

    if (Math.abs(largestValue) > 1000000) {
      return 20;
    }

    return 0;
  };

  const leftMargin = getLeftMargin();

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
              <XAxis
                dataKey={yAxis}
                angle={isAngled ? -35 : 0}
                height={isAngled ? Math.sqrt(longestLabelLength) * 25 : 30}
                tickFormatter={formatXTick}
                tick={{
                  fill: theme.pageText,
                  textAnchor: isAngled ? 'end' : 'middle',
                }}
                tickLine={{ stroke: theme.pageText }}
              />
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
                dataKey={val => getVal(val)}
                stackId="a"
                {...animationProps}
                onMouseLeave={() => setPointer('')}
                onMouseEnter={() => setPointer('pointer')}
                onClick={item => {
                  if (compact && !showTooltip) {
                    return;
                  }

                  const intervalPayload = hasIntervalDates(item.payload)
                    ? item.payload
                    : undefined;
                  const itemPayload = hasUncategorizedId(item.payload)
                    ? item.payload
                    : undefined;

                  // Interval bars drill down by their own date range instead of a field
                  const drilldown =
                    groupBy === 'Interval'
                      ? {
                          startDate:
                            intervalPayload?.intervalStartDate ??
                            data.startDate,
                          endDate:
                            intervalPayload?.intervalEndDate ?? data.endDate,
                        }
                      : {
                          startDate: data.startDate,
                          endDate: data.endDate,
                          field: groupBy.toLowerCase(),
                          id: item.id,
                          uncategorizedId: itemPayload?.uncategorizedId,
                        };

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
                    bucketTagNames: item.payload.bucketTagNames,
                    scopeTagNames: data.scopeTagNames,
                  });
                }}
                shape={(props: BarShapeProps) => (
                  <Rectangle
                    {...props}
                    fill={
                      data.legend[props.index]?.color ?? props.fill ?? undefined
                    }
                  />
                )}
              >
                {viewLabels && !compact && (
                  <LabelList
                    dataKey={val => getVal(val)}
                    content={e => customLabel(e, balanceTypeOp, format)}
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
