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
    totalAssets: string;
    totalDebts: string;
  };
  typeItem?: string | null;
  splitItem: string;
  mode: string;
  monthsCount: number;
  style?: object | null;
};

const TableRow = memo(
  ({ item, typeItem, splitItem, mode, monthsCount, style }: TableRowProps) => {
    const average = amountToInteger(item[typeItem]) / monthsCount;
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
        <Cell value={item[splitItem]} width="flex" />
        {item.monthData && mode === 'time'
          ? item.monthData.map(item => {
              return (
                <Cell
                  key={amountToCurrency(item[typeItem])}
                  value={amountToCurrency(item[typeItem])}
                  width="flex"
                  privacyFilter
                />
              );
            })
          : typeItem === 'totalTotals' && (
              <>
                <Cell value={amountToCurrency(item.totalAssets)} width="flex" />
                <Cell value={amountToCurrency(item.totalDebts)} width="flex" />
              </>
            )}
        <Cell
          value={amountToCurrency(item[typeItem])}
          style={{
            fontWeight: 600,
          }}
          width="flex"
          privacyFilter
        />
        <Cell
          value={integerToCurrency(Math.round(average))}
          style={{
            fontWeight: 600,
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
  typeItem,
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
        typeItem={typeItem}
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
          .filter(i => (empty ? i[typeItem] !== 0 : true))
          .map(item => {
            return (
              <TableRow
                key={item.id}
                item={item}
                typeItem={typeItem}
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
      <Cell value={split} width="flex" />
      {interval
        ? interval.map(header => {
            return (
              <Cell
                key={header}
                // eslint-disable-next-line rulesdir/typography
                value={d.format(d.parseISO(`${header}-01`), "MMM ''yy")}
                width="flex"
              />
            );
          })
        : type === 3 && (
            <>
              <Cell value={'Assets'} width="flex" />
              <Cell value={'Debts'} width="flex" />
            </>
          )}
      <Cell value={'Totals'} width="flex" />
      <Cell value={'Average'} width="flex" />
      {scrollWidth > 0 && <Cell width={scrollWidth} />}
    </Row>
  );
}

export function TableTotals({
  data,
  scrollWidth,
  typeItem,
  mode,
  monthsCount,
}) {
  const average = amountToInteger(data[typeItem]) / monthsCount;
  return (
    <Row
      collapsed={true}
      style={{
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
      }}
    >
      <Cell value={'Totals'} width="flex" />
      {mode === 'time'
        ? data.monthData.map(item => {
            return (
              <Cell
                key={amountToCurrency(item[typeItem])}
                value={amountToCurrency(item[typeItem])}
                width="flex"
                privacyFilter
              />
            );
          })
        : typeItem === 'totalTotals' && (
            <>
              <Cell value={amountToCurrency(data.totalAssets)} width="flex" />
              <Cell value={amountToCurrency(data.totalDebts)} width="flex" />
            </>
          )}
      <Cell
        value={amountToCurrency(data[typeItem])}
        width="flex"
        privacyFilter
      />
      <Cell
        value={integerToCurrency(Math.round(average))}
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
  typeItem,
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
        .filter(i => (empty ? i[typeItem] !== 0 : true))
        .map(item => {
          if (split === 'Category') {
            return (
              <GroupedTableRow
                key={item.id}
                item={item}
                typeItem={typeItem}
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
                typeItem={typeItem}
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
      <View style={{ maxWidth: '100%', overflow: 'auto' }}>
        <div ref={contentRef}>{children}</div>
      </View>
    </View>
  );
}
