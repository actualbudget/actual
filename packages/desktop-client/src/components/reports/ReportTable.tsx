import React, { useLayoutEffect, useRef, memo } from 'react';

import * as d from 'date-fns';
//import { useSelector } from 'react-redux';

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
  typeOp?: string | null;
  splitItem: string;
  mode: string;
  monthsCount: number;
  style?: object | null;
};

const TableRow = memo(
  ({ item, typeOp, splitItem, mode, monthsCount, style }: TableRowProps) => {
    const average = amountToInteger(item[typeOp]) / monthsCount;
    return (
      <Row
        key={item[splitItem]}
        collapsed={true}
        style={{
          color: theme.tableText,
          backgroundColor: theme.tableBackground,
          ...style,
        }}
      >
        <Cell
          value={item[splitItem]}
          width="flex"
          title={item[splitItem].length > 12 && item[splitItem]}
          style={{
            minWidth: 125,
          }}
        />
        {item.monthData && mode === 'time'
          ? item.monthData.map(item => {
              return (
                <Cell
                  style={{
                    minWidth: 85,
                  }}
                  key={amountToCurrency(item[typeOp])}
                  value={amountToCurrency(item[typeOp])}
                  title={
                    Math.abs(item[typeOp]) > 100000 &&
                    amountToCurrency(item[typeOp])
                  }
                  width="flex"
                  privacyFilter
                />
              );
            })
          : typeOp === 'totalTotals' && (
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
          value={amountToCurrency(item[typeOp])}
          title={
            Math.abs(item[typeOp]) > 100000 && amountToCurrency(item[typeOp])
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
  typeOp,
  splitItem,
  mode,
  monthsCount,
  empty,
}) {
  return (
    <>
      <TableRow
        key={item.id}
        item={item}
        typeOp={typeOp}
        splitItem={splitItem}
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
              ? typeOp === 'totalTotals'
                ? i.totalAssets !== 0 ||
                  i.totalDebts !== 0 ||
                  i.totalTotals !== 0
                : i[typeOp] !== 0
              : true,
          )
          .map(item => {
            return (
              <TableRow
                key={item.id}
                item={item}
                typeOp={typeOp}
                splitItem={splitItem}
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

export function TableHeader({ scrollWidth, split, interval, type }) {
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
        value={split}
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
        : type === 3 && (
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

export function TableTotals({ data, scrollWidth, typeOp, mode, monthsCount }) {
  const average = amountToInteger(data[typeOp]) / monthsCount;
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
                key={amountToCurrency(item[typeOp])}
                value={amountToCurrency(item[typeOp])}
                title={
                  Math.abs(item[typeOp]) > 100000 &&
                  amountToCurrency(item[typeOp])
                }
                width="flex"
                privacyFilter
              />
            );
          })
        : typeOp === 'totalTotals' && (
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
        value={amountToCurrency(data[typeOp])}
        title={
          Math.abs(data[typeOp]) > 100000 && amountToCurrency(data[typeOp])
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

export function TotalTableList({
  data,
  empty,
  monthsCount,
  typeOp,
  mode,
  split,
}) {
  const splitItem = ['Month', 'Year'].includes(split) ? 'date' : 'name';
  const splitData =
    split === 'Category'
      ? 'gData'
      : ['Month', 'Year'].includes(split)
      ? 'monthData'
      : 'data';

  return (
    <View>
      {data[splitData]
        .filter(i =>
          !empty
            ? typeOp === 'totalTotals'
              ? i.totalAssets !== 0 || i.totalDebts !== 0 || i.totalTotals !== 0
              : i[typeOp] !== 0
            : true,
        )
        .map(item => {
          if (split === 'Category') {
            return (
              <GroupedTableRow
                key={item.id}
                item={item}
                typeOp={typeOp}
                splitItem={splitItem}
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
                typeOp={typeOp}
                splitItem={splitItem}
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
    // We wait for the list to mount because AutoSizer needs to run
    // before it's mounted

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
