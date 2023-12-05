import React, {
  useCallback,
  useLayoutEffect,
  type UIEventHandler,
} from 'react';
import { type RefProp } from 'react-spring';

import { type CSSProperties } from '../../style';
import Block from '../common/Block';
import View from '../common/View';

import ColumnPrimary from './ColumnPrimary';
import ColumnScrollbar from './ColumnScrollbar';
import { type GroupedEntity } from './entities';
import ReportTableInner from './ReportTableInner';
import ReportTableRow from './ReportTableRow';

type ReportTableProps = {
  saveScrollWidth: (value: number) => void;
  listScrollRef: RefProp<HTMLDivElement>;
  indexScrollRef: RefProp<HTMLDivElement>;
  scrollScrollRef: RefProp<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  style?: CSSProperties;
  groupBy: string;
  balanceTypeOp: string;
  showEmpty: boolean;
  data: GroupedEntity[];
  mode: string;
  monthsCount: number;
};

export default function ReportTable({
  saveScrollWidth,
  listScrollRef,
  indexScrollRef,
  scrollScrollRef,
  handleScroll,
  style,
  groupBy,
  balanceTypeOp,
  showEmpty,
  data,
  mode,
  monthsCount,
}: ReportTableProps) {
  const groupByItem = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';

  useLayoutEffect(() => {
    if (scrollScrollRef.current && saveScrollWidth) {
      saveScrollWidth(
        scrollScrollRef.current ? scrollScrollRef.current.offsetWidth : 0,
      );
    }
  });

  let renderItem = useCallback(
    ({ item, groupByItem, mode, monthsCount, style, key }) => {
      return (
        <ReportTableRow
          key={key}
          item={item}
          balanceTypeOp={balanceTypeOp}
          groupByItem={groupByItem}
          mode={mode}
          monthsCount={monthsCount}
          style={style}
        />
      );
    },
    [],
  );

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        outline: 'none',
        '& .animated .animated-row': { transition: '.25s transform' },
        ...style,
      }}
      tabIndex={1}
      data-testid="table"
    >
      <Block
        innerRef={indexScrollRef}
        onScroll={handleScroll}
        id={'index'}
        style={{
          width: 150,
          flexShrink: 0,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '::-webkit-scrollbar': { display: 'none' },
          justifyContent: 'center',
        }}
      >
        {data.map(item => {
          return (
            <ColumnPrimary
              key={item.id}
              item={item}
              balanceTypeOp={balanceTypeOp}
              groupByItem={groupByItem}
              showEmpty={showEmpty}
            />
          );
        })}
      </Block>
      <Block
        style={{
          overflowY: 'auto',
          flex: 1,
          scrollbarWidth: 'none',
          '::-webkit-scrollbar': { display: 'none' },
        }}
        id={'list'}
        innerRef={listScrollRef}
        onScroll={handleScroll}
      >
        <ReportTableInner
          data={data}
          showEmpty={showEmpty}
          monthsCount={monthsCount}
          balanceTypeOp={balanceTypeOp}
          mode={mode}
          groupBy={groupBy}
          renderItem={renderItem}
        />
      </Block>
      <Block
        id={'scroll'}
        innerRef={scrollScrollRef}
        onScroll={handleScroll}
        style={{
          overflowY: 'auto',
        }}
      >
        {data.map(item => {
          return (
            <ColumnScrollbar
              key={item.id}
              item={item}
              balanceTypeOp={balanceTypeOp}
              showEmpty={showEmpty}
            />
          );
        })}
      </Block>
    </View>
  );
}
