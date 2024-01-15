// @ts-strict-ignore
import React, { memo } from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';

import { type CSSProperties, styles, theme } from '../../../../style';
import { Row, Cell } from '../../../table';
import { type GroupedEntity } from '../../entities';

type ReportTableRowProps = {
  item: GroupedEntity;
  balanceTypeOp?: string;
  groupByItem: string;
  mode: string;
  style?: CSSProperties;
  monthsCount: number;
};

export const ReportTableRow = memo(
  ({
    item,
    balanceTypeOp,
    groupByItem,
    mode,
    style,
    monthsCount,
  }: ReportTableRowProps) => {
    const average: number = amountToInteger(item[balanceTypeOp]) / monthsCount;
    return (
      <Row
        collapsed={true}
        style={{
          color: theme.tableText,
          backgroundColor: theme.tableBackground,
          ...style,
        }}
      >
        <Cell
          value={item[groupByItem]}
          title={item[groupByItem].length > 12 && item[groupByItem]}
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
                    minWidth: 85,
                    ...styles.tnum,
                  }}
                  value={amountToCurrency(month[balanceTypeOp])}
                  title={
                    Math.abs(month[balanceTypeOp]) > 100000 &&
                    amountToCurrency(month[balanceTypeOp])
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
                    Math.abs(item.totalAssets) > 100000 &&
                    amountToCurrency(item.totalAssets)
                  }
                  width="flex"
                  privacyFilter
                  style={{
                    minWidth: 85,
                    ...styles.tnum,
                  }}
                />
                <Cell
                  value={amountToCurrency(item.totalDebts)}
                  title={
                    Math.abs(item.totalDebts) > 100000 &&
                    amountToCurrency(item.totalDebts)
                  }
                  width="flex"
                  privacyFilter
                  style={{
                    minWidth: 85,
                    ...styles.tnum,
                  }}
                />
              </>
            )}
        <Cell
          value={amountToCurrency(item[balanceTypeOp])}
          title={
            Math.abs(item[balanceTypeOp]) > 100000 &&
            amountToCurrency(item[balanceTypeOp])
          }
          style={{
            fontWeight: 600,
            minWidth: 85,
            ...styles.tnum,
          }}
          width="flex"
          privacyFilter
        />
        <Cell
          value={integerToCurrency(Math.round(average))}
          title={
            Math.abs(Math.round(average / 100)) > 100000 &&
            integerToCurrency(Math.round(average))
          }
          style={{
            fontWeight: 600,
            minWidth: 85,
            ...styles.tnum,
          }}
          width="flex"
          privacyFilter
        />
      </Row>
    );
  },
);
