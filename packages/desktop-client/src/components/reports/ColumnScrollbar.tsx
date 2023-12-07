import React from 'react';

import { theme } from '../../style';
import View from '../common/View';
import { Row } from '../table';

import { type GroupedEntity } from './entities';
import TableRowIndex from './TableRowIndex';

type ColumnScrollbarProps = {
  item: GroupedEntity;
  balanceTypeOp: string;
  showEmpty: boolean;
};

function ColumnScrollbar({
  item,
  balanceTypeOp,
  showEmpty,
}: ColumnScrollbarProps) {
  return (
    <>
      <TableRowIndex
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
                return <TableRowIndex key={cat.id} />;
              })}
          </View>
          <Row height={20} />
        </>
      )}
    </>
  );
}

export default ColumnScrollbar;
