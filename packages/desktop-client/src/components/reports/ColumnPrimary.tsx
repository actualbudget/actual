import React from 'react';

import { theme } from '../../style';
import View from '../common/View';
import { Row } from '../table';

import { type GroupedEntity } from './entities';
import TableRowIndex from './TableRowIndex';

type ColumnPrimaryProps = {
  item: GroupedEntity;
  balanceTypeOp?: string | null;
  groupByItem: string;
  showEmpty: boolean;
};

function ColumnPrimary({
  item,
  balanceTypeOp,
  groupByItem,
  showEmpty,
}: ColumnPrimaryProps) {
  return (
    <>
      <TableRowIndex
        key={item.id}
        item={item}
        groupByItem={groupByItem}
        style={
          item.categories && {
            color: theme.tableRowHeaderText,
            backgroundColor: theme.tableRowHeaderBackground,
            fontWeight: 600,
          }
        }
      />
      {item.categories && (
        <>
          <View>
            {item.categories
              .filter(i =>
                !showEmpty
                  ? balanceTypeOp === 'totalTotals'
                    ? i.totalAssets !== 0 ||
                      i.totalDebts !== 0 ||
                      i.totalTotals !== 0
                    : i[balanceTypeOp] !== 0
                  : true,
              )
              .map(cat => {
                return (
                  <TableRowIndex
                    key={cat.id}
                    item={cat}
                    groupByItem={groupByItem}
                  />
                );
              })}
          </View>
          <Row height={20} />
        </>
      )}
    </>
  );
}

export default ColumnPrimary;
