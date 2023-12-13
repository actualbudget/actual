import React, { memo } from 'react';

import { amountToCurrency } from 'loot-core/src/shared/util';

import { styles, theme } from '../../style';
import { Row, Cell } from '../table';

import { type GroupedEntity } from './entities';

type ReportTableRowProps = {
  item: GroupedEntity;
  balanceTypeOp?: string;
  groupByItem: string;
  mode: string;
  style?: object;
};

const ReportTableRow = memo(
  ({ item, balanceTypeOp, groupByItem, mode, style }: ReportTableRowProps) => {
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
        {item.monthData &&
          mode === 'time' &&
          item.monthData.map(month => {
            return (
              <Cell
                style={{
                  minWidth: 85,
                  ...styles.tnum,
                }}
                key={amountToCurrency(month[balanceTypeOp])}
                value={amountToCurrency(month[balanceTypeOp])}
                title={
                  Math.abs(month[balanceTypeOp]) > 100000 &&
                  amountToCurrency(month[balanceTypeOp])
                }
                width="flex"
                privacyFilter
              />
            );
          })}
      </Row>
    );
  },
);

export default ReportTableRow;
