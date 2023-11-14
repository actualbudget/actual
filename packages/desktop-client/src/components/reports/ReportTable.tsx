import React, { useLayoutEffect, useRef, memo } from 'react';

import * as d from 'date-fns';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';

import { theme } from '../../style';
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
          }}
        />
        {item.monthData && mode === 'time'
          ? item.monthData.map(month => {
              return (
                <Cell
                  style={{
                    minWidth: 85,
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

export function TableHeader({ scrollWidth, groupBy, interval, balanceType }) {
  return (
    <Row
      collapsed={true}
      style={{
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
      }}
    >
      <Cell
        style={{
          minWidth: 125,
        }}
        value={groupBy}
        width="flex"
      />
      {interval
        ? interval.map(header => {
            return (
              <Cell
                style={{
                  minWidth: 85,
                }}
                key={header}
                // eslint-disable-next-line rulesdir/typography
                value={d.format(d.parseISO(`${header}-01`), "MMM ''yy")}
                width="flex"
              />
            );
          })
        : balanceType === 'Net' && (
            <>
              <Cell
                style={{
                  minWidth: 85,
                }}
                value={'Assets'}
                width="flex"
              />
              <Cell
                style={{
                  minWidth: 85,
                }}
                value={'Debts'}
                width="flex"
              />
            </>
          )}
      <Cell
        style={{
          minWidth: 85,
        }}
        value={'Totals'}
        width="flex"
      />
      <Cell
        style={{
          minWidth: 85,
        }}
        value={'Average'}
        width="flex"
      />
      {scrollWidth > 0 && <Cell width={scrollWidth} />}
    </Row>
  );
}

export function TableTotals({
  data,
  scrollWidth,
  balanceTypeOp,
  mode,
  monthsCount,
}) {
  const average = amountToInteger(data[balanceTypeOp]) / monthsCount;
  return (
    <Row
      collapsed={true}
      style={{
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
      }}
    >
      <Cell
        style={{
          minWidth: 125,
        }}
        value={'Totals'}
        width="flex"
      />
      {mode === 'time'
        ? data.monthData.map(item => {
            return (
              <Cell
                style={{
                  minWidth: 85,
                }}
                key={amountToCurrency(item[balanceTypeOp])}
                value={amountToCurrency(item[balanceTypeOp])}
                title={
                  Math.abs(item[balanceTypeOp]) > 100000 &&
                  amountToCurrency(item[balanceTypeOp])
                }
                width="flex"
                privacyFilter
              />
            );
          })
        : balanceTypeOp === 'totalTotals' && (
            <>
              <Cell
                style={{
                  minWidth: 85,
                }}
                value={amountToCurrency(data.totalAssets)}
                title={
                  Math.abs(data.totalAssets) > 100000 &&
                  amountToCurrency(data.totalAssets)
                }
                width="flex"
              />
              <Cell
                style={{
                  minWidth: 85,
                }}
                value={amountToCurrency(data.totalDebts)}
                title={
                  Math.abs(data.totalDebts) > 100000 &&
                  amountToCurrency(data.totalDebts)
                }
                width="flex"
              />
            </>
          )}
      <Cell
        style={{
          minWidth: 85,
        }}
        value={amountToCurrency(data[balanceTypeOp])}
        title={
          Math.abs(data[balanceTypeOp]) > 100000 &&
          amountToCurrency(data[balanceTypeOp])
        }
        width="flex"
        privacyFilter
      />
      <Cell
        style={{
          minWidth: 85,
        }}
        value={integerToCurrency(Math.round(average))}
        title={
          Math.abs(Math.round(average / 100)) > 100000 &&
          integerToCurrency(Math.round(average))
        }
        width="flex"
        privacyFilter
      />

      {scrollWidth > 0 && <Cell width={scrollWidth} />}
    </Row>
  );
}

export function TableList({
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

export default function SimpleTable({ saveScrollWidth, style, children }) {
  let contentRef = useRef<HTMLDivElement>();

  useLayoutEffect(() => {
    if (contentRef.current && saveScrollWidth) {
      saveScrollWidth(
        contentRef.current.offsetParent
          ? contentRef.current.parentElement.offsetWidth
          : 0,
        contentRef.current ? contentRef.current.offsetWidth : 0,
      );
    }
  });

  return (
    <View
      style={{
        flex: 1,
        outline: 'none',
        '& .animated .animated-row': { transition: '.25s transform' },
        ...style,
      }}
      tabIndex={1}
      data-testid="table"
    >
      <View>
        <div ref={contentRef}>{children}</div>
      </View>
    </View>
  );
}
