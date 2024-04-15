// @ts-strict-ignore
import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  type UIEventHandler,
} from 'react';
import { type RefProp } from 'react-spring';

import { type GroupedEntity } from 'loot-core/src/types/models/reports';

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
  data: GroupedEntity;
  mode: string;
  intervalsCount: number;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export function ReportTable({
  saveScrollWidth,
  listScrollRef,
  handleScroll,
  groupBy,
  balanceTypeOp,
  data,
  mode,
  intervalsCount,
  compact,
  style,
  compactStyle,
  showHiddenCategories,
  showOffBudget,
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
      startDate,
      endDate,
      groupBy,
      mode,
      intervalsCount,
      compact,
      style,
      compactStyle,
    }) => {
      return (
        <ReportTableRow
          item={item}
          balanceTypeOp={balanceTypeOp}
          startDate={startDate}
          endDate={endDate}
          groupBy={groupBy}
          mode={mode}
          intervalsCount={intervalsCount}
          compact={compact}
          style={style}
          compactStyle={compactStyle}
          showHiddenCategories={showHiddenCategories}
          showOffBudget={showOffBudget}
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
          intervalsCount={intervalsCount}
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
