import React, { memo } from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';
import {
  type IntervalData,
  type DataEntity,
} from 'loot-core/src/types/models/reports';

import { useAccounts } from '../../../../hooks/useAccounts';
import { useCategories } from '../../../../hooks/useCategories';
import { useNavigate } from '../../../../hooks/useNavigate';
import { type CSSProperties, theme } from '../../../../style';
import { Row, Cell } from '../../../table';

type ReportTableRowProps = {
  item: DataEntity;
  balanceTypeOp: 'totalAssets' | 'totalDebts' | 'totalTotals';
  startDate: string;
  endDate: string;
  groupBy: string;
  mode: string;
  intervalsCount: number;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export const ReportTableRow = memo(
  ({
    item,
    balanceTypeOp,
    startDate,
    endDate,
    groupBy,
    mode,
    intervalsCount,
    compact,
    style,
    compactStyle,
    showHiddenCategories,
    showOffBudget,
  }: ReportTableRowProps) => {
    const average = amountToInteger(item[balanceTypeOp]) / intervalsCount;
    const isClickable = groupBy !== 'Interval' && !item.categories;
    const groupByItem = groupBy === 'Interval' ? 'date' : 'name';

    const navigate = useNavigate();
    const categories = useCategories();
    const accounts = useAccounts();

    const onShowActivity = (item: DataEntity, intervalItem?: IntervalData) => {
      const amount = balanceTypeOp === 'totalDebts' ? 'lte' : 'gte';
      const field = groupBy === 'Interval' ? null : groupBy.toLowerCase();
      const hiddenCategories = categories.list
        .filter(f => f.hidden)
        .map(e => e.id);
      const offBudgetAccounts = accounts
        .filter(f => f.offbudget)
        .map(e => e.id);
      const getDate =
        mode === 'time'
          ? [
              {
                field: 'date',
                op: 'is',
                value: intervalItem ? intervalItem.dateLookup : null,
                options: { date: true },
              },
            ]
          : [
              {
                field: 'date',
                op: 'gte',
                value: startDate,
                options: { date: true },
                type: 'date',
              },
              {
                field: 'date',
                op: 'lte',
                value: endDate,
                options: { date: true },
                type: 'date',
              },
            ];

      const conditions = [
        { field, op: 'is', value: item.id, type: 'id' },
        ...getDate,
        balanceTypeOp !== 'totalTotals' && {
          field: 'amount',
          op: amount,
          value: 0,
          type: 'number',
        },
        hiddenCategories.length > 0 &&
          !showHiddenCategories && {
            field: 'category',
            op: 'notOneOf',
            value: hiddenCategories,
            type: 'id',
          },
        offBudgetAccounts.length > 0 &&
          !showOffBudget && {
            field: 'account',
            op: 'notOneOf',
            value: offBudgetAccounts,
            type: 'id',
          },
      ].filter(f => f);
      navigate('/accounts', {
        state: {
          goBack: true,
          conditions,
          categoryId: item.id,
        },
      });
    };

    return (
      <Row
        key={item.id}
        collapsed={true}
        style={{
          color: theme.tableText,
          backgroundColor: theme.tableBackground,
          ...style,
        }}
      >
        <Cell
          value={item[groupByItem]}
          title={item[groupByItem] ?? undefined}
          style={{
            width: compact ? 80 : 125,
            flexShrink: 0,
          }}
          valueStyle={compactStyle}
        />
        {item.intervalData && mode === 'time'
          ? item.intervalData.map(intervalItem => {
              return (
                <Cell
                  key={amountToCurrency(intervalItem[balanceTypeOp])}
                  style={{
                    minWidth: compact ? 50 : 85,
                    cursor: isClickable ? 'pointer' : 'inherit',
                  }}
                  valueStyle={compactStyle}
                  value={amountToCurrency(intervalItem[balanceTypeOp])}
                  title={
                    Math.abs(intervalItem[balanceTypeOp]) > 100000
                      ? amountToCurrency(intervalItem[balanceTypeOp])
                      : undefined
                  }
                  width="flex"
                  onClick={() =>
                    isClickable && onShowActivity(item, intervalItem)
                  }
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
                  valueStyle={compactStyle}
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
                  valueStyle={compactStyle}
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
            cursor: isClickable ? 'pointer' : 'inherit',
          }}
          valueStyle={compactStyle}
          width="flex"
          onClick={() => isClickable && onShowActivity(item)}
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
      </Row>
    );
  },
);

ReportTableRow.displayName = 'ReportTableRow';
