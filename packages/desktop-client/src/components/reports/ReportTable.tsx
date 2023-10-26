import React, { useLayoutEffect, useRef, memo } from 'react';

import * as d from 'date-fns';
//import { useSelector } from 'react-redux';

import { amountToCurrency } from 'loot-core/src/shared/util';

import { theme } from '../../style';
import View from '../common/View';
import { Row, Cell } from '../table';

type TableRowProps = {
  item: {
    date: string;
    name: string;
  };
  totalItem: string;
  typeItem?: string | null;
  splitItem: string;
  mode: string;
  data?: [] | null;
};

const TableRow = memo(
  ({ item, totalItem, typeItem, splitItem, mode, data }: TableRowProps) => {
    return (
      <Row
        key={item[splitItem]}
        collapsed={true}
        style={{
          color: theme.tableText,
          backgroundColor: theme.tableBackground,
        }}
      >
        <Cell value={item[splitItem]} width="flex" />
        {data &&
          mode === 'time' &&
          data.map(item => {
            return (
              <Cell
                key={amountToCurrency(item[typeItem])}
                value={amountToCurrency(item[typeItem])}
                width="flex"
                privacyFilter
              />
            );
          })}
        <Cell
          value={amountToCurrency(item[totalItem])}
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

export function TableHeader({ scrollWidth, split, interval }) {
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
      {interval &&
        interval.map(header => {
          return (
            <Cell
              key={header}
              // eslint-disable-next-line rulesdir/typography
              value={d.format(d.parseISO(`${header}-01`), "MMM ''yy")}
              width="flex"
            />
          );
        })}
      <Cell value={'Totals'} width="flex" />
      {scrollWidth > 0 && <Cell width={scrollWidth} />}
    </Row>
  );
}

export function TableTotals({ data, scrollWidth, totalItem, mode }) {
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
      {mode === 'time' &&
        data.monthData.map(item => {
          return (
            <Cell
              key={amountToCurrency(item[totalItem])}
              value={amountToCurrency(item[totalItem])}
              width="flex"
              privacyFilter
            />
          );
        })}
      <Cell
        key={data[totalItem]}
        value={amountToCurrency(data[totalItem])}
        width="flex"
        privacyFilter
      />

      {scrollWidth > 0 && <Cell width={scrollWidth} />}
    </Row>
  );
}

export function TotalTableList({ data, empty, months, type, mode, split }) {
  const splitItem = ['Month', 'Year'].includes(split) ? 'date' : 'name';
  const splitData = ['Month', 'Year'].includes(split) ? 'monthData' : 'data';

  let typeItem;
  let totalItem;

  switch (type) {
    case 1:
      typeItem = 'debts';
      totalItem = 'totalDebts';
      break;
    case 2:
      typeItem = 'assets';
      totalItem = 'totalAssets';
      break;
    case 3:
      typeItem = 'y';
      totalItem = 'totalTotals';
      break;
    default:
  }

  return (
    <View>
      {data[splitData]
        .filter(i => (empty ? i[totalItem] !== 0 : true))
        .map(item => {
          return (
            <TableRow
              key={item.id}
              item={item}
              totalItem={totalItem}
              typeItem={mode === 'time' && typeItem}
              splitItem={splitItem}
              mode={mode}
              data={mode === 'time' && item.graphData.data}
            />
          );
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
