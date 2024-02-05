import React, { memo } from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';
import { type DataEntity } from 'loot-core/src/types/models/reports';

import { type CSSProperties, styles, theme } from '../../../../style';
import { Row, Cell } from '../../../table';

type ReportTableRowProps = {
  item: DataEntity;
  balanceTypeOp: 'totalAssets' | 'totalDebts' | 'totalTotals';
  groupByItem: 'id' | 'name';
  mode: string;
  style?: CSSProperties;
  monthsCount: number;
  compact: boolean;
};

export const ReportTableRow = memo(
  ({
    item,
    balanceTypeOp,
    groupByItem,
    mode,
    style,
    monthsCount,
    compact,
  }: ReportTableRowProps) => {
    const average = amountToInteger(item[balanceTypeOp]) / monthsCount;
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
          title={item[groupByItem].length > 12 ? item[groupByItem] : undefined}
          style={{
            width: 120,
            flexShrink: 0,
            ...styles.tnum,
          }}
        />
        {item.monthData && mode === 'time'
          ? item.monthData.map(month => {
              return (
                <Cell
                  key={amountToCurrency(month[balanceTypeOp])}
                  style={{
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
                  value={amountToCurrency(month[balanceTypeOp])}
                  title={
                    Math.abs(month[balanceTypeOp]) > 100000
                      ? amountToCurrency(month[balanceTypeOp])
                      : undefined
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
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
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
                    minWidth: compact ? 80 : 125,
                    ...styles.tnum,
                  }}
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
            minWidth: compact ? 80 : 125,
            ...styles.tnum,
          }}
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
            minWidth: compact ? 80 : 125,
            ...styles.tnum,
          }}
          width="flex"
          privacyFilter
        />
      </Row>
    );
  },
);
