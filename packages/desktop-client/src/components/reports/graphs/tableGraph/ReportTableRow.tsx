import React, {
  memo,
  type RefObject,
  type UIEventHandler,
  type CSSProperties,
} from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type balanceTypeOpType,
  type GroupedEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { showActivity } from '@desktop-client/components/reports/graphs/showActivity';
import { Row, Cell } from '@desktop-client/components/table';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

type ReportTableRowProps = {
  item: GroupedEntity;
  balanceTypeOp: balanceTypeOpType;
  groupBy: string;
  mode: string;
  filters?: RuleConditionEntity[];
  startDate?: string;
  endDate?: string;
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
};

const getAmountColor = (amount: number) => {
  if (amount === 0) return undefined;
  return amount > 0 ? theme.noticeText : theme.errorText;
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
  }: ReportTableRowProps) => {
    const average = Math.round(item[balanceTypeOp] / intervalsCount);
    const groupByItem = groupBy === 'Interval' ? 'date' : 'name';
    const format = useFormat();

    const navigate = useNavigate();
    const { isNarrowWidth } = useResponsive();
    const categories = useCategories();
    const accounts = useAccounts();

    const pointer =
      !isNarrowWidth &&
      !['Group', 'Interval'].includes(groupBy) &&
      !compact &&
      !categories.grouped.map(g => g.id).includes(item.id)
        ? 'pointer'
        : 'inherit';

    const hoverUnderline =
      !isNarrowWidth &&
      !['Group', 'Interval'].includes(groupBy) &&
      !compact &&
      !categories.grouped.map(g => g.id).includes(item.id)
        ? {
            cursor: pointer,
            ':hover': { textDecoration: 'underline' },
            flexGrow: 0,
          }
        : {};

    return (
      <Row
        key={item.id}
        height={height}
        collapsed={true}
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
            }}
            valueStyle={compactStyle}
          />
          {item.intervalData && mode === 'time'
            ? item.intervalData.map((intervalItem, index) => {
                return (
                  <Cell
                    key={index}
                    textAlign="right"
                    style={{
                      minWidth: compact ? 50 : 85,
                      ...(colorized && {
                        color: getAmountColor(intervalItem[balanceTypeOp]),
                      }),
                    }}
                    unexposedContent={({ value }) => (
                      <Text
                        style={{
                          ...hoverUnderline,
                          textAlign: 'right',
                          flexGrow: 1,
                        }}
                      >
                        {value}
                      </Text>
                    )}
                    valueStyle={compactStyle}
                    value={format(intervalItem[balanceTypeOp], 'financial')}
                    title={
                      Math.abs(intervalItem[balanceTypeOp]) > 100000
                        ? format(intervalItem[balanceTypeOp], 'financial')
                        : undefined
                    }
                    onClick={() =>
                      !isNarrowWidth &&
                      !['Group', 'Interval'].includes(groupBy) &&
                      !compact &&
                      !categories.grouped.map(g => g.id).includes(item.id) &&
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
                        field: groupBy.toLowerCase(),
                        id: item.id,
                        interval,
                      })
                    }
                    width="flex"
                    privacyFilter
                  />
                );
              })
            : balanceTypeOp === 'totalTotals' && (
                <>
                  <Cell
                    value={format(item.totalAssets, 'financial')}
                    title={
                      Math.abs(item.totalAssets) > 100000
                        ? format(item.totalAssets, 'financial')
                        : undefined
                    }
                    textAlign="right"
                    width="flex"
                    privacyFilter
                    style={{
                      minWidth: compact ? 50 : 85,
                      ...(colorized && {
                        color: getAmountColor(item.totalAssets),
                      }),
                    }}
                    unexposedContent={({ value }) => (
                      <Text
                        style={{
                          ...hoverUnderline,
                          textAlign: 'right',
                          flexGrow: 1,
                        }}
                      >
                        {value}
                      </Text>
                    )}
                    valueStyle={compactStyle}
                    onClick={() =>
                      !isNarrowWidth &&
                      !['Group', 'Interval'].includes(groupBy) &&
                      !compact &&
                      !categories.grouped.map(g => g.id).includes(item.id) &&
                      showActivity({
                        navigate,
                        categories,
                        accounts,
                        balanceTypeOp,
                        filters,
                        showHiddenCategories,
                        showOffBudget,
                        type: 'assets',
                        startDate,
                        endDate,
                        field: groupBy.toLowerCase(),
                        id: item.id,
                      })
                    }
                  />
                  <Cell
                    value={format(item.totalDebts, 'financial')}
                    title={
                      Math.abs(item.totalDebts) > 100000
                        ? format(item.totalDebts, 'financial')
                        : undefined
                    }
                    textAlign="right"
                    width="flex"
                    privacyFilter
                    style={{
                      minWidth: compact ? 50 : 85,
                      ...(colorized && {
                        color: getAmountColor(item.totalDebts),
                      }),
                    }}
                    unexposedContent={({ value }) => (
                      <Text
                        style={{
                          ...hoverUnderline,
                          textAlign: 'right',
                          flexGrow: 1,
                        }}
                      >
                        {value}
                      </Text>
                    )}
                    valueStyle={compactStyle}
                    onClick={() =>
                      !isNarrowWidth &&
                      !['Group', 'Interval'].includes(groupBy) &&
                      !compact &&
                      !categories.grouped.map(g => g.id).includes(item.id) &&
                      showActivity({
                        navigate,
                        categories,
                        accounts,
                        balanceTypeOp,
                        filters,
                        showHiddenCategories,
                        showOffBudget,
                        type: 'debts',
                        startDate,
                        endDate,
                        field: groupBy.toLowerCase(),
                        id: item.id,
                      })
                    }
                  />
                </>
              )}
          <Cell
            value={format(item[balanceTypeOp], 'financial')}
            title={
              Math.abs(item[balanceTypeOp]) > 100000
                ? format(item[balanceTypeOp], 'financial')
                : undefined
            }
            textAlign="right"
            style={{
              fontWeight: 600,
              minWidth: compact ? 50 : 85,
              ...(colorized && { color: getAmountColor(item[balanceTypeOp]) }),
            }}
            unexposedContent={({ value }) => (
              <Text
                style={{
                  ...hoverUnderline,
                  textAlign: 'right',
                  flexGrow: 1,
                }}
              >
                {value}
              </Text>
            )}
            valueStyle={compactStyle}
            onClick={() =>
              !isNarrowWidth &&
              !['Group', 'Interval'].includes(groupBy) &&
              !compact &&
              !categories.grouped.map(g => g.id).includes(item.id) &&
              showActivity({
                navigate,
                categories,
                accounts,
                balanceTypeOp,
                filters,
                showHiddenCategories,
                showOffBudget,
                type: 'totals',
                startDate,
                endDate,
                field: groupBy.toLowerCase(),
                id: item.id,
              })
            }
            width="flex"
            privacyFilter
          />
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
              ...(colorized && { color: getAmountColor(average) }),
            }}
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
