import React, { memo } from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';

import { styles, theme } from '../../style';
import View from '../common/View';
import { Row, Cell } from '../table';

type TableRowProps = {
  item: {
    date: string;
    name: string;
    monthData: [];
    totalAssets: number;
    totalDebts: number;
  };
  balanceTypeOp?: string | null;
  groupByItem: string;
  mode: string;
  monthsCount: number;
  style?: object | null;
};

const TableRow = memo(
  ({
    item,
    balanceTypeOp,
    groupByItem,
    mode,
    monthsCount,
    style,
  }: TableRowProps) => {
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
        <Cell
          value={item[groupByItem]}
          width="flex"
          title={item[groupByItem].length > 12 && item[groupByItem]}
          style={{
            minWidth: 125,
            ...styles.tnum,
          }}
        />
        {item.monthData && mode === 'time'
          ? item.monthData.map(month => {
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

function GroupedTableRow({
  item,
  balanceTypeOp,
  groupByItem,
  mode,
  monthsCount,
  empty,
}) {
  return (
    <>
      <TableRow
        key={item.id}
        item={item}
        balanceTypeOp={balanceTypeOp}
        groupByItem={groupByItem}
        mode={mode}
        monthsCount={monthsCount}
        style={{
          color: theme.tableRowHeaderText,
          backgroundColor: theme.tableRowHeaderBackground,
          fontWeight: 600,
        }}
      />
      <View>
        {item.categories
          .filter(i =>
            !empty
              ? balanceTypeOp === 'totalTotals'
                ? i.totalAssets !== 0 ||
                  i.totalDebts !== 0 ||
                  i.totalTotals !== 0
                : i[balanceTypeOp] !== 0
              : true,
          )
          .map(cat => {
            return (
              <TableRow
                key={cat.id}
                item={cat}
                balanceTypeOp={balanceTypeOp}
                groupByItem={groupByItem}
                mode={mode}
                monthsCount={monthsCount}
              />
            );
          })}
      </View>
      <Row height={20} />
    </>
  );
}

export default function ReportTableList({
  data,
  empty,
  monthsCount,
  balanceTypeOp,
  mode,
  groupBy,
}) {
  const groupByItem = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';
  const groupByData =
    groupBy === 'Category'
      ? 'groupedData'
      : ['Month', 'Year'].includes(groupBy)
      ? 'monthData'
      : 'data';

  return (
    <View>
      {data[groupByData]
        .filter(i =>
          !empty
            ? balanceTypeOp === 'totalTotals'
              ? i.totalAssets !== 0 || i.totalDebts !== 0 || i.totalTotals !== 0
              : i[balanceTypeOp] !== 0
            : true,
        )
        .map(item => {
          if (groupBy === 'Category') {
            return (
              <GroupedTableRow
                key={item.id}
                item={item}
                balanceTypeOp={balanceTypeOp}
                groupByItem={groupByItem}
                mode={mode}
                monthsCount={monthsCount}
                empty={empty}
              />
            );
          } else {
            return (
              <TableRow
                key={item.id}
                item={item}
                balanceTypeOp={balanceTypeOp}
                groupByItem={groupByItem}
                mode={mode}
                monthsCount={monthsCount}
              />
            );
          }
        })}
    </View>
  );
}
