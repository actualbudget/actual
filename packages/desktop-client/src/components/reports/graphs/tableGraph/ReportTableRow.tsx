import React, { memo } from 'react';
import type { CSSProperties, RefObject, UIEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  balanceTypeOpType,
  ComparisonBreakdown,
  GroupedEntity,
  IntervalEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { countElapsedDays } from '#components/reports/comparisonRange';
import { showActivity } from '#components/reports/graphs/showActivity';
import { useFormatComparisonWindow } from '#components/reports/graphs/useFormatComparisonWindow';
import { Cell, Row } from '#components/table';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';

import { SPLIT_MIN_WIDTHS, splitColumnStyle } from './ReportTableHeader';

type ReportTableRowProps = {
  item: GroupedEntity;
  balanceTypeOp: balanceTypeOpType;
  groupBy: string;
  mode: string;
  filters?: RuleConditionEntity[];
  startDate?: string;
  endDate?: string;
  showComparison?: boolean;
  showProjected?: boolean;
  // Split each interval into current, comparison and change cells
  splitIntervals?: boolean;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  intervalsCount: number;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  totalStyle?: CSSProperties;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  interval: string;
  totalScrollRef?: RefObject<HTMLDivElement | null>;
  handleScroll?: UIEventHandler<HTMLDivElement>;
  height?: number;
  colorized?: boolean;
  scopeTagNames?: string[];
};

const getAmountColor = (amount: number) => {
  if (amount === 0) return theme.reportsNumberNeutral;
  return amount > 0 ? theme.reportsNumberPositive : theme.reportsNumberNegative;
};

export const ReportTableRow = memo(
  ({
    item,
    balanceTypeOp,
    groupBy,
    mode,
    filters = [],
    startDate = '',
    endDate,
    showComparison = false,
    showProjected = false,
    splitIntervals = false,
    comparisonStartDate = '',
    comparisonEndDate = '',
    intervalsCount,
    compact,
    style,
    compactStyle,
    totalStyle,
    showHiddenCategories = false,
    showOffBudget = false,
    totalScrollRef,
    handleScroll,
    height,
    interval,
    colorized,
    scopeTagNames,
  }: ReportTableRowProps) => {
    const breakdown = showComparison ? item.comparison : undefined;
    // Comparison tables keep real amounts, so they match the transactions a
    // click-through shows, and put the change in its own column
    const amounts = breakdown ? breakdown.actual : item;
    const comparisonAmount =
      mode === 'time' ? breakdown?.perInterval : breakdown?.expected;
    // Every window is before the earliest transaction, so nothing is compared
    const hasNoComparisonData = !!breakdown?.noData;
    // Time tables compare a typical interval at the pace so far against the
    // Comparison column, while total tables compare the whole range
    const pace = mode === 'time' ? breakdown?.pacePerInterval : undefined;
    const average = pace
      ? pace[balanceTypeOp]
      : Math.round(amounts[balanceTypeOp] / intervalsCount);
    const change = pace
      ? average - (comparisonAmount?.[balanceTypeOp] ?? 0)
      : item[balanceTypeOp];
    const groupByItem = groupBy === 'Interval' ? 'date' : 'name';
    const format = useFormat();
    const { t } = useTranslation();
    const formatComparisonWindow = useFormatComparisonWindow();

    // Spells out what a comparison interval was compared against, since its
    // length can differ from the average interval in the Comparison column
    const getIntervalTitle = (
      intervalItem: IntervalEntity,
      intervalBreakdown: ComparisonBreakdown | undefined,
    ) => {
      if (!intervalBreakdown) {
        const amount = intervalItem[balanceTypeOp];
        return Math.abs(amount) > 100000
          ? format(amount, 'financial')
          : undefined;
      }

      const comparisonWindow = formatComparisonWindow(
        intervalItem.comparisonStartDate,
        intervalItem.comparisonEndDate,
      );
      // A window before the earliest transaction has nothing to compare
      if (intervalBreakdown.noData) {
        return t('Comparison ({{comparisonWindow}}): no data', {
          comparisonWindow,
        });
      }

      const change = intervalItem[balanceTypeOp];
      const expected = format(
        intervalBreakdown.expected[balanceTypeOp],
        'financial',
      );
      const comparisonLine = comparisonWindow
        ? t('Comparison ({{comparisonWindow}}): {{amount}}', {
            comparisonWindow,
            amount: expected,
          })
        : // Budgets are compared per interval, so their length doesn't matter
          balanceTypeOp === 'totalBudgeted' ||
            !intervalItem.intervalStartDate ||
            !intervalItem.intervalEndDate
          ? t('Comparison: {{amount}}', { amount: expected })
          : // Budgets are spread by months, so a day count doesn't apply
            intervalBreakdown.budgeted
            ? t('Budgeted: {{amount}}', { amount: expected })
            : t('Comparison: {{amount}} over {{count}} days', {
                amount: expected,
                // Intervals in progress compare the days so far
                count: countElapsedDays(
                  intervalItem.intervalStartDate,
                  intervalItem.intervalEndDate,
                ),
              });
      const lines = [
        comparisonLine,
        t('Change: {{amount}}', {
          amount: (change > 0 ? '+' : '') + format(change, 'financial'),
        }),
      ];
      return lines.join('\n');
    };

    const navigate = useNavigate();
    const { isNarrowWidth } = useResponsive();
    const { data: categories = { grouped: [], list: [] } } = useCategories();
    const { data: accounts = [] } = useAccounts();

    const isGroupRow =
      item.uncategorizedId === 'all' ||
      categories.grouped.some(g => g.id === item.id);
    const drilldownField = isGroupRow ? 'group' : groupBy.toLowerCase();
    // Interval rows drill down by the date range of their intervals (a single
    // interval, or all of them for the totals row) instead of a field
    const firstInterval = item.intervalData[0];
    const lastInterval = item.intervalData[item.intervalData.length - 1];
    const drilldown =
      groupBy === 'Interval'
        ? {
            startDate: firstInterval?.intervalStartDate ?? startDate,
            endDate: lastInterval?.intervalEndDate ?? endDate,
          }
        : {
            startDate,
            endDate,
            field: drilldownField,
            id: item.id,
          };
    const canShowActivity = !isNarrowWidth && !compact;

    const onShowTotals = () =>
      canShowActivity &&
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
        uncategorizedId: item.uncategorizedId,
        bucketTagNames: item.bucketTagNames,
        scopeTagNames,
      });

    // Interval rows open their offset windows. A range comparison has no
    // window for each interval, so those rows open the whole range
    const comparisonDrilldown =
      groupBy === 'Interval' &&
      firstInterval?.comparisonStartDate &&
      lastInterval?.comparisonEndDate
        ? {
            startDate: firstInterval.comparisonStartDate,
            endDate: lastInterval.comparisonEndDate,
          }
        : { startDate: comparisonStartDate, endDate: comparisonEndDate };
    const onShowComparison = () =>
      canShowActivity &&
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
        ...comparisonDrilldown,
        uncategorizedId: item.uncategorizedId,
        bucketTagNames: item.bucketTagNames,
        scopeTagNames,
      });

    const pointer = canShowActivity ? 'pointer' : 'inherit';

    const hoverUnderline = canShowActivity
      ? {
          cursor: pointer,
          ':hover': { textDecoration: 'underline' },
          flexGrow: 0,
        }
      : {};

    return (
      <Row
        key={item.id}
        data-testid={`report-row-${item.name}`}
        height={height}
        collapsed
        style={{
          color: theme.tableText,
          backgroundColor: theme.tableBackground,
          ...style,
        }}
      >
        <View
          innerRef={totalScrollRef}
          onScroll={handleScroll}
          id={totalScrollRef ? 'total' : item.id}
          style={{
            flexDirection: 'row',
            flex: 1,
            backgroundColor: style?.backgroundColor,
            ...totalStyle,
          }}
        >
          <Cell
            value={item[groupByItem]}
            title={item[groupByItem]}
            style={{
              width: compact ? 80 : 125,
              flexShrink: 0,
              flexGrow: 1,
              backgroundColor: style?.backgroundColor,
            }}
            valueStyle={compactStyle}
          />
          {showComparison && hasNoComparisonData && (
            <Cell
              value={t('No data')}
              textAlign="right"
              style={{
                minWidth: compact ? 50 : 85,
                backgroundColor: style?.backgroundColor,
                color: theme.tableTextSubdued,
              }}
              valueStyle={compactStyle}
              width="flex"
            />
          )}
          {showComparison && !hasNoComparisonData && (
            <Cell
              value={format(
                comparisonAmount?.[balanceTypeOp] ?? 0,
                'financial',
              )}
              textAlign="right"
              style={{
                minWidth: compact ? 50 : 85,
                backgroundColor: style?.backgroundColor,
                ...(colorized && {
                  color: getAmountColor(comparisonAmount?.[balanceTypeOp] ?? 0),
                }),
              }}
              unexposedContent={({ value }) => (
                <FinancialText
                  style={{
                    ...hoverUnderline,
                    textAlign: 'right',
                    flexGrow: 1,
                  }}
                >
                  {value}
                </FinancialText>
              )}
              valueStyle={compactStyle}
              onClick={onShowComparison}
              width="flex"
              privacyFilter
            />
          )}
          {item.intervalData && mode === 'time'
            ? item.intervalData.map((intervalItem, index) => {
                const onShowInterval = () =>
                  canShowActivity &&
                  showActivity({
                    navigate,
                    categories,
                    accounts,
                    balanceTypeOp,
                    filters,
                    showHiddenCategories,
                    showOffBudget,
                    type: 'time',
                    startDate: intervalItem.intervalStartDate || '',
                    endDate: intervalItem.intervalEndDate || '',
                    field: drilldownField,
                    id: item.id,
                    uncategorizedId: item.uncategorizedId,
                    interval,
                    bucketTagNames: item.bucketTagNames,
                    scopeTagNames,
                  });
                if (splitIntervals) {
                  const windowStart = intervalItem.comparisonStartDate;
                  const windowEnd = intervalItem.comparisonEndDate;
                  return (
                    <SplitIntervalCells
                      key={index}
                      intervalItem={intervalItem}
                      breakdown={intervalItem.comparison}
                      balanceTypeOp={balanceTypeOp}
                      backgroundColor={style?.backgroundColor}
                      hoverStyle={hoverUnderline}
                      colorized={colorized}
                      onShowInterval={onShowInterval}
                      onShowComparison={
                        // Budgets have no transactions to show
                        intervalItem.comparison?.budgeted
                          ? undefined
                          : windowStart && windowEnd
                            ? () =>
                                canShowActivity &&
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
                                  startDate: windowStart,
                                  endDate: windowEnd,
                                  uncategorizedId: item.uncategorizedId,
                                  bucketTagNames: item.bucketTagNames,
                                  scopeTagNames,
                                })
                            : onShowComparison
                      }
                    />
                  );
                }
                // With a comparison, cells show real amounts coloured by their
                // change from it
                const intervalBreakdown = breakdown && intervalItem.comparison;
                const intervalAmount = intervalBreakdown
                  ? intervalBreakdown.actual[balanceTypeOp]
                  : intervalItem[balanceTypeOp];
                const intervalChange =
                  intervalBreakdown && !intervalBreakdown.noData
                    ? intervalItem[balanceTypeOp]
                    : undefined;
                const intervalColor =
                  intervalChange !== undefined
                    ? getAmountColor(intervalChange)
                    : colorized && getAmountColor(intervalAmount);
                return (
                  <Cell
                    key={index}
                    textAlign="right"
                    style={{
                      minWidth: compact ? 50 : 85,
                      backgroundColor: style?.backgroundColor,
                      ...(intervalColor && { color: intervalColor }),
                    }}
                    unexposedContent={({ value }) => (
                      <FinancialText
                        style={{
                          ...hoverUnderline,
                          textAlign: 'right',
                          flexGrow: 1,
                        }}
                      >
                        {value}
                      </FinancialText>
                    )}
                    valueStyle={compactStyle}
                    value={format(intervalAmount, 'financial')}
                    title={getIntervalTitle(intervalItem, intervalBreakdown)}
                    onClick={onShowInterval}
                    width="flex"
                    privacyFilter
                  />
                );
              })
            : ['totalTotals', 'totalBudgeted'].includes(balanceTypeOp) && (
                <>
                  <Cell
                    value={format(amounts.totalAssets, 'financial')}
                    title={
                      Math.abs(amounts.totalAssets) > 100000
                        ? format(amounts.totalAssets, 'financial')
                        : undefined
                    }
                    textAlign="right"
                    width="flex"
                    privacyFilter
                    style={{
                      minWidth: compact ? 50 : 85,
                      backgroundColor: style?.backgroundColor,
                      ...(colorized && {
                        color: getAmountColor(amounts.totalAssets),
                      }),
                    }}
                    unexposedContent={({ value }) => (
                      <FinancialText
                        style={{
                          ...hoverUnderline,
                          textAlign: 'right',
                          flexGrow: 1,
                        }}
                      >
                        {value}
                      </FinancialText>
                    )}
                    valueStyle={compactStyle}
                    onClick={() =>
                      canShowActivity &&
                      showActivity({
                        navigate,
                        categories,
                        accounts,
                        balanceTypeOp,
                        filters,
                        showHiddenCategories,
                        showOffBudget,
                        type: 'assets',
                        ...drilldown,
                        uncategorizedId: item.uncategorizedId,
                        bucketTagNames: item.bucketTagNames,
                        scopeTagNames,
                      })
                    }
                  />
                  <Cell
                    value={format(amounts.totalDebts, 'financial')}
                    title={
                      Math.abs(amounts.totalDebts) > 100000
                        ? format(amounts.totalDebts, 'financial')
                        : undefined
                    }
                    textAlign="right"
                    width="flex"
                    privacyFilter
                    style={{
                      minWidth: compact ? 50 : 85,
                      backgroundColor: style?.backgroundColor,
                      ...(colorized && {
                        color: getAmountColor(amounts.totalDebts),
                      }),
                    }}
                    unexposedContent={({ value }) => (
                      <FinancialText
                        style={{
                          ...hoverUnderline,
                          textAlign: 'right',
                          flexGrow: 1,
                        }}
                      >
                        {value}
                      </FinancialText>
                    )}
                    valueStyle={compactStyle}
                    onClick={() =>
                      canShowActivity &&
                      showActivity({
                        navigate,
                        categories,
                        accounts,
                        balanceTypeOp,
                        filters,
                        showHiddenCategories,
                        showOffBudget,
                        type: 'debts',
                        ...drilldown,
                        uncategorizedId: item.uncategorizedId,
                        bucketTagNames: item.bucketTagNames,
                        scopeTagNames,
                      })
                    }
                  />
                </>
              )}
          <Cell
            value={format(amounts[balanceTypeOp], 'financial')}
            title={
              Math.abs(amounts[balanceTypeOp]) > 100000
                ? format(amounts[balanceTypeOp], 'financial')
                : undefined
            }
            textAlign="right"
            style={{
              fontWeight: 600,
              minWidth: compact ? 50 : 85,
              backgroundColor: style?.backgroundColor,
              ...(colorized && {
                color: getAmountColor(amounts[balanceTypeOp]),
              }),
            }}
            unexposedContent={({ value }) => (
              <FinancialText
                style={{
                  ...hoverUnderline,
                  textAlign: 'right',
                  flexGrow: 1,
                }}
              >
                {value}
              </FinancialText>
            )}
            valueStyle={compactStyle}
            onClick={onShowTotals}
            width="flex"
            privacyFilter
          />
          {breakdown && showProjected && (
            <AmountCell
              value={(breakdown.projected ?? breakdown.actual)[balanceTypeOp]}
              compact={compact}
              backgroundColor={style?.backgroundColor}
              compactStyle={compactStyle}
              hoverStyle={hoverUnderline}
              onClick={onShowTotals}
              colorized={colorized}
            />
          )}
          {breakdown && hasNoComparisonData && (
            <Cell
              value=""
              style={{
                minWidth: compact ? 50 : 85,
                backgroundColor: style?.backgroundColor,
              }}
              width="flex"
            />
          )}
          {breakdown && !hasNoComparisonData && (
            <AmountCell
              value={change}
              compact={compact}
              backgroundColor={style?.backgroundColor}
              compactStyle={compactStyle}
              hoverStyle={hoverUnderline}
              onClick={onShowTotals}
              colorized
            />
          )}
          <Cell
            value={format(average, 'financial')}
            title={
              Math.abs(average / 100) > 100000
                ? format(average, 'financial')
                : undefined
            }
            textAlign="right"
            style={{
              fontWeight: 600,
              minWidth: compact ? 50 : 85,
              backgroundColor: style?.backgroundColor,
              ...(colorized && { color: getAmountColor(average) }),
            }}
            unexposedContent={({ value }) => (
              <FinancialText style={{ textAlign: 'right', flexGrow: 1 }}>
                {value}
              </FinancialText>
            )}
            valueStyle={compactStyle}
            width="flex"
            privacyFilter
          />
        </View>
      </Row>
    );
  },
);

ReportTableRow.displayName = 'ReportTableRow';

type AmountCellProps = {
  value: number;
  compact: boolean;
  backgroundColor?: CSSProperties['backgroundColor'];
  compactStyle?: CSSProperties;
  hoverStyle?: CSSProperties;
  onClick?: () => void;
  colorized?: boolean;
};

function AmountCell({
  value,
  compact,
  backgroundColor,
  compactStyle,
  hoverStyle,
  onClick,
  colorized,
}: AmountCellProps) {
  const format = useFormat();

  return (
    <Cell
      value={format(value, 'financial')}
      title={Math.abs(value) > 100000 ? format(value, 'financial') : undefined}
      textAlign="right"
      style={{
        fontWeight: 600,
        minWidth: compact ? 50 : 85,
        backgroundColor,
        ...(colorized && { color: getAmountColor(value) }),
      }}
      unexposedContent={({ value }) => (
        <FinancialText
          style={{ ...hoverStyle, textAlign: 'right', flexGrow: 1 }}
        >
          {value}
        </FinancialText>
      )}
      valueStyle={compactStyle}
      onClick={onClick}
      width="flex"
      privacyFilter
    />
  );
}

type SplitIntervalCellsProps = {
  intervalItem: IntervalEntity;
  breakdown: ComparisonBreakdown | undefined;
  balanceTypeOp: balanceTypeOpType;
  backgroundColor?: CSSProperties['backgroundColor'];
  hoverStyle?: CSSProperties;
  colorized?: boolean;
  onShowInterval: () => void;
  onShowComparison?: () => void;
};

/**
 * An interval's current amount, the amount it's compared with, and the
 * change as an amount and a percentage of the comparison.
 */
function SplitIntervalCells({
  intervalItem,
  breakdown,
  balanceTypeOp,
  backgroundColor,
  hoverStyle,
  colorized,
  onShowInterval,
  onShowComparison,
}: SplitIntervalCellsProps) {
  const format = useFormat();
  const { t } = useTranslation();

  const amount = breakdown
    ? breakdown.actual[balanceTypeOp]
    : intervalItem[balanceTypeOp];
  // A window before the earliest transaction has nothing to compare
  const hasComparison = !!breakdown && !breakdown.noData;
  const comparedAmount = breakdown?.expected[balanceTypeOp] ?? 0;
  // An interval's own amount is its change
  const change = intervalItem[balanceTypeOp];
  const percent =
    hasComparison && comparedAmount !== 0
      ? Math.round((change / Math.abs(comparedAmount)) * 100)
      : undefined;

  const [currentStyle, comparisonStyle, changeStyle] = SPLIT_MIN_WIDTHS.map(
    minWidth => ({ ...splitColumnStyle(minWidth), backgroundColor }),
  );
  const renderValue =
    (clickable: boolean) =>
    ({ value }: { value?: string }) => (
      <FinancialText
        style={{
          ...(clickable && hoverStyle),
          textAlign: 'right',
          flexGrow: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </FinancialText>
    );

  return (
    <>
      <Cell
        textAlign="right"
        style={{
          ...currentStyle,
          ...(colorized && { color: getAmountColor(amount) }),
        }}
        unexposedContent={renderValue(true)}
        value={format(amount, 'financial')}
        onClick={onShowInterval}
        width="flex"
        privacyFilter
      />
      {hasComparison ? (
        <Cell
          textAlign="right"
          style={{
            ...comparisonStyle,
            ...(colorized && { color: getAmountColor(comparedAmount) }),
          }}
          unexposedContent={renderValue(!!onShowComparison)}
          value={format(comparedAmount, 'financial')}
          onClick={onShowComparison}
          width="flex"
          privacyFilter
        />
      ) : (
        <Cell
          textAlign="right"
          style={{ ...comparisonStyle, color: theme.tableTextSubdued }}
          value={t('No data')}
          width="flex"
        />
      )}
      <Cell
        textAlign="right"
        style={{
          ...changeStyle,
          ...(hasComparison && { color: getAmountColor(change) }),
        }}
        unexposedContent={renderValue(false)}
        value={
          !hasComparison
            ? ''
            : percent === undefined
              ? format(change, 'financial')
              : `${format(change, 'financial')} (${percent}%)`
        }
        width="flex"
        privacyFilter
      />
    </>
  );
}
