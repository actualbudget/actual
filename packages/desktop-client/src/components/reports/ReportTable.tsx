import React, {
  useCallback,
  useLayoutEffect,
  type UIEventHandler,
} from 'react';
import { type RefProp } from 'react-spring';

import { theme, type CSSProperties } from '../../style';
import Block from '../common/Block';
import View from '../common/View';

import { type GroupedEntity } from './entities';
import ReportTableColumnIndex from './ReportTableColumnIndex';
import ReportTableColumnTotals from './ReportTableColumTotals';
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
      const [parent, child] = [
        scrollScrollRef.current.offsetWidth,
        scrollScrollRef.current.clientWidth,
      ];

      saveScrollWidth(parent > 0 && child > 0 && parent - child);
    }
  });

  const renderItemTotal = useCallback(
    ({ item, groupByItem, monthsCount, style, key }) => {
      return (
        <ReportTableColumnTotals
          key={key}
          item={item}
          balanceTypeOp={balanceTypeOp}
          monthsCount={monthsCount}
          groupByItem={groupByItem}
          mode={mode}
          style={style}
        />
      );
    },
    [],
  );

  const renderItem = useCallback(({ item, groupByItem, mode, style, key }) => {
    return (
      <ReportTableRow
        key={key}
        item={item}
        balanceTypeOp={balanceTypeOp}
        groupByItem={groupByItem}
        mode={mode}
        style={style}
      />
    );
  }, []);

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
            <ReportTableColumnIndex
              key={item.id}
              item={item}
              groupByItem={groupByItem}
              headerStyle={
                item.categories && {
                  color: theme.tableRowHeaderText,
                  backgroundColor: theme.tableRowHeaderBackground,
                  fontWeight: 600,
                }
              }
            />
          );
        })}
      </Block>
      <Block
        style={{
          overflow: 'auto',
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
          monthsCount={monthsCount}
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
          flexShrink: 0,
        }}
      >
        <ReportTableInner
          data={data}
          monthsCount={monthsCount}
          mode={mode}
          groupBy={groupBy}
          renderItem={renderItemTotal}
        />
      </Block>
    </View>
  );
}
