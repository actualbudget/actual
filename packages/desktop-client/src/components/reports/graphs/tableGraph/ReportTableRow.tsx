import React, { memo } from 'react';
import type { CSSProperties, RefObject, UIEventHandler } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  balanceTypeOpType,
  GroupedEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { showActivity } from '#components/reports/graphs/showActivity';
import { Cell, Row } from '#components/table';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';

type ReportTableRowProps = {
  item: GroupedEntity;
  balanceTypeOp: balanceTypeOpType;
  groupBy: string;
  mode: string;
  filters?: RuleConditionEntity[];
  startDate?: string;
  endDate?: string;
  showBaseline?: boolean;
  showProjected?: boolean;
  baselineStartDate?: string;
  baselineEndDate?: string;
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
    showBaseline = false,
    showProjected = false,
    baselineStartDate = '',
    baselineEndDate = '',
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
    const breakdown = showBaseline ? item.baseline : undefined;
    // Total tables keep real amounts and add a change column beside them, so
    // the amounts match the transactions a click-through shows
    const hasChangeColumn = !!breakdown && mode !== 'time';
    const amounts = hasChangeColumn ? breakdown.actual : item;
    const baselineAmount =
      mode === 'time' ? breakdown?.perInterval : breakdown?.expected;
    const average = Math.round(amounts[balanceTypeOp] / intervalsCount);
    const groupByItem = groupBy === 'Interval' ? 'date' : 'name';
    const format = useFormat();

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

    // A single interval has no matching slice of the baseline, so interval
    // rows open the whole baseline range
    const onShowBaseline = () =>
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
        startDate: baselineStartDate,
        endDate: baselineEndDate,
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
          {showBaseline && (
            <Cell
              value={format(baselineAmount?.[balanceTypeOp] ?? 0, 'financial')}
              textAlign="right"
              style={{
                minWidth: compact ? 50 : 85,
                backgroundColor: style?.backgroundColor,
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
              onClick={onShowBaseline}
              width="flex"
              privacyFilter
            />
          )}
          {item.intervalData && mode === 'time'
            ? item.intervalData.map((intervalItem, index) => {
                return (
                  <Cell
                    key={index}
                    textAlign="right"
                    style={{
                      minWidth: compact ? 50 : 85,
                      backgroundColor: style?.backgroundColor,
                      ...(colorized && {
                        color: getAmountColor(intervalItem[balanceTypeOp]),
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
                    value={format(intervalItem[balanceTypeOp], 'financial')}
                    title={
                      Math.abs(intervalItem[balanceTypeOp]) > 100000
                        ? format(intervalItem[balanceTypeOp], 'financial')
                        : undefined
                    }
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
                        type: 'time',
                        startDate: intervalItem.intervalStartDate || '',
                        endDate: intervalItem.intervalEndDate || '',
                        field: drilldownField,
                        id: item.id,
                        uncategorizedId: item.uncategorizedId,
                        interval,
                        bucketTagNames: item.bucketTagNames,
                        scopeTagNames,
                      })
                    }
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
          {mode === 'time' && breakdown && showProjected && (
            <AmountCell
              value={(breakdown.projected ?? breakdown.actual)[balanceTypeOp]}
              compact={compact}
              backgroundColor={style?.backgroundColor}
              compactStyle={compactStyle}
              hoverStyle={hoverUnderline}
              onClick={onShowTotals}
            />
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
          {hasChangeColumn && showProjected && (
            <AmountCell
              value={(breakdown.projected ?? breakdown.actual)[balanceTypeOp]}
              compact={compact}
              backgroundColor={style?.backgroundColor}
              compactStyle={compactStyle}
              hoverStyle={hoverUnderline}
              onClick={onShowTotals}
            />
          )}
          {hasChangeColumn && (
            <AmountCell
              value={item[balanceTypeOp]}
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
