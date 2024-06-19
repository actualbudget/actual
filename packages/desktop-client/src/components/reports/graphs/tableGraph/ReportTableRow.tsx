import React, { memo, type RefObject, type UIEventHandler } from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';
import { balanceTypeOpType, type GroupedEntity } from 'loot-core/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useAccounts } from '../../../../hooks/useAccounts';
import { useCategories } from '../../../../hooks/useCategories';
import { useNavigate } from '../../../../hooks/useNavigate';
import { useResponsive } from '../../../../ResponsiveProvider';
import { type CSSProperties, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row, Cell } from '../../../table';
import { showActivity } from '../showActivity';

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
  totalScrollRef?: RefObject<HTMLDivElement>;
  handleScroll?: UIEventHandler<HTMLDivElement>;
  height?: number;
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
  }: ReportTableRowProps) => {
    const average = amountToInteger(item[balanceTypeOp]) / intervalsCount;
    const groupByItem = groupBy === 'Interval' ? 'date' : 'name';

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
            }}
            valueStyle={compactStyle}
          />
          {item.intervalData && mode === 'time'
            ? item.intervalData.map((intervalItem, index) => {
                return (
                  <Cell
                    key={index}
                    style={{
                      minWidth: compact ? 50 : 85,
                    }}
                    linkStyle={hoverUnderline}
                    valueStyle={compactStyle}
                    value={amountToCurrency(intervalItem[balanceTypeOp])}
                    title={
                      Math.abs(intervalItem[balanceTypeOp]) > 100000
                        ? amountToCurrency(intervalItem[balanceTypeOp])
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
                    value={amountToCurrency(item.totalAssets)}
                    title={
                      Math.abs(item.totalAssets) > 100000
                        ? amountToCurrency(item.totalAssets)
                        : undefined
                    }
                    width="flex"
                    privacyFilter
                    style={{
                      minWidth: compact ? 50 : 85,
                    }}
                    linkStyle={hoverUnderline}
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
                    value={amountToCurrency(item.totalDebts)}
                    title={
                      Math.abs(item.totalDebts) > 100000
                        ? amountToCurrency(item.totalDebts)
                        : undefined
                    }
                    width="flex"
                    privacyFilter
                    style={{
                      minWidth: compact ? 50 : 85,
                    }}
                    linkStyle={hoverUnderline}
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
            value={amountToCurrency(item[balanceTypeOp])}
            title={
              Math.abs(item[balanceTypeOp]) > 100000
                ? amountToCurrency(item[balanceTypeOp])
                : undefined
            }
            style={{
              fontWeight: 600,
              minWidth: compact ? 50 : 85,
            }}
            linkStyle={hoverUnderline}
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
            value={integerToCurrency(Math.round(average))}
            title={
              Math.abs(Math.round(average / 100)) > 100000
                ? integerToCurrency(Math.round(average))
                : undefined
            }
            style={{
              fontWeight: 600,
              minWidth: compact ? 50 : 85,
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
