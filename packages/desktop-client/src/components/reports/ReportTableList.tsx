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
  compact?;
};

const TableRow = memo(
  ({
    item,
    balanceTypeOp,
    groupByItem,
    mode,
    monthsCount,
    style,
    compact,
  }: TableRowProps) => {
    const average = amountToInteger(item[balanceTypeOp]) / monthsCount;
    const compactStyle = compact && { ...styles.tinyText };
    const rowStyle = compact && { flex: '0 0 20px', height: 20 };
    return (
      <Row
        key={item[groupByItem]}
        collapsed={true}
        style={{
          color: theme.tableText,
          backgroundColor: theme.tableBackground,
          ...rowStyle,
          ...style,
        }}
      >
        <Cell
          value={item[groupByItem]}
          width="flex"
          title={item[groupByItem].length > 12 && item[groupByItem]}
          style={{
            minWidth: !compact && 125,
            ...compactStyle,
          }}
        />
        {item.monthData && mode === 'time'
          ? item.monthData.map(month => {
              return (
                <Cell
                  style={{
                    minWidth: !compact && 85,
                    ...compactStyle,
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
                    minWidth: !compact && 85,
                    ...compactStyle,
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
                    minWidth: !compact && 85,
                    ...compactStyle,
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
            minWidth: !compact && 85,
            ...compactStyle,
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
            minWidth: !compact && 85,
            ...compactStyle,
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
  compact,
}) {
  return (
    <>
      <TableRow
        key={item.id}
        compact={compact}
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
                compact={compact}
                item={cat}
                balanceTypeOp={balanceTypeOp}
                groupByItem={groupByItem}
                mode={mode}
                monthsCount={monthsCount}
              />
            );
          })}
      </View>
      <Row height={compact ? 10 : 20} />
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
  compact,
}) {
  const groupByItem = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';
  const groupByData =
    groupBy === 'Category'
      ? 'groupData'
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
                compact={compact}
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
                compact={compact}
              />
            );
          }
        })}
    </View>
  );
}
