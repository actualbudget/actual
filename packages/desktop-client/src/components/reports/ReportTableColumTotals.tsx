import React, { memo } from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';

import { styles, theme } from '../../style';
import { Row, Cell } from '../table';

import { type GroupedEntity } from './entities';

type ReportTableColumnTotalsProps = {
  item: GroupedEntity;
  balanceTypeOp?: string;
  groupByItem: string;
  monthsCount: number;
  mode: string;
  style?: object;
};

const ReportTableColumnTotals = memo(
  ({
    item,
    balanceTypeOp,
    groupByItem,
    monthsCount,
    mode,
    style,
  }: ReportTableColumnTotalsProps) => {
    const average = amountToInteger(item[balanceTypeOp]) / monthsCount;
    return (
      <Row
        key={item[groupByItem]}
        collapsed={true}
        style={{
          color: theme.tableText,
          backgroundColor: theme.tableBackground,
          ...style,
        }}
      >
        {balanceTypeOp === 'totalTotals' && (
          <>
            <Cell
              value={amountToCurrency(item.totalAssets)}
              title={
                Math.abs(item.totalAssets) > 100000 &&
                amountToCurrency(item.totalAssets)
              }
              width="flex"
              style={{
                width: 85,
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
              style={{
                width: 85,
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
            width: 85,
            ...styles.tnum,
          }}
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
            width: 85,
            ...styles.tnum,
          }}
          privacyFilter
        />
      </Row>
    );
  },
);

export default ReportTableColumnTotals;
