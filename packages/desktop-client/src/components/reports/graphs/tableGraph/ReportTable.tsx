// @ts-strict-ignore
import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  type UIEventHandler,
} from 'react';
import { type RefProp } from 'react-spring';

import { type DataEntity } from 'loot-core/src/types/models/reports';

import { type CSSProperties } from '../../../../style';
import { Block } from '../../../common/Block';
import { View } from '../../../common/View';

import { ReportTableList } from './ReportTableList';
import { ReportTableRow } from './ReportTableRow';

type ReportTableProps = {
  saveScrollWidth: (value: number) => void;
  listScrollRef: RefProp<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  groupBy: string;
  balanceTypeOp: 'totalDebts' | 'totalTotals' | 'totalAssets';
  data: DataEntity[];
  mode: string;
  monthsCount: number;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
};

export function ReportTable({
  saveScrollWidth,
  listScrollRef,
  handleScroll,
  groupBy,
  balanceTypeOp,
  data,
  mode,
  monthsCount,
  compact,
  style,
  compactStyle,
}: ReportTableProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current && saveScrollWidth) {
      saveScrollWidth(contentRef.current ? contentRef.current.offsetWidth : 0);
    }
  });

  const renderItem = useCallback(
    ({
      item,
      groupByItem,
      mode,
      monthsCount,
      compact,
      style,
      compactStyle,
    }) => {
      return (
        <ReportTableRow
          item={item}
          balanceTypeOp={balanceTypeOp}
          groupByItem={groupByItem}
          mode={mode}
          monthsCount={monthsCount}
          compact={compact}
          style={style}
          compactStyle={compactStyle}
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
      }}
      tabIndex={1}
    >
      <Block
        innerRef={listScrollRef}
        onScroll={handleScroll}
        id="list"
        style={{
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '::-webkit-scrollbar': { display: 'none' },
          flex: 1,
          outline: 'none',
          '& .animated .animated-row': { transition: '.25s transform' },
        }}
      >
        <ReportTableList
          data={data}
          monthsCount={monthsCount}
          mode={mode}
          groupBy={groupBy}
          renderItem={renderItem}
          compact={compact}
          style={style}
          compactStyle={compactStyle}
        />
      </Block>
    </View>
  );
}
