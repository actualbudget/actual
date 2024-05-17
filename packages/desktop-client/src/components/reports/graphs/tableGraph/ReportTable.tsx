import React, {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  type UIEventHandler,
} from 'react';

import {
  type GroupedEntity,
  type DataEntity,
} from 'loot-core/src/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { type CSSProperties } from '../../../../style';
import { Block } from '../../../common/Block';
import { View } from '../../../common/View';

import { ReportTableList } from './ReportTableList';
import { ReportTableRow } from './ReportTableRow';

type ReportTableProps = {
  saveScrollWidth: (value: number) => void;
  listScrollRef: RefObject<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  groupBy: string;
  balanceTypeOp: 'totalDebts' | 'totalTotals' | 'totalAssets';
  data: DataEntity;
  filters?: RuleConditionEntity[];
  mode: string;
  intervalsCount: number;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export type renderRowProps = {
  item: GroupedEntity;
  mode: string;
  intervalsCount: number;
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
  filters,
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

  const renderRow = useCallback(
    ({
      item,
      mode,
      intervalsCount,
      compact,
      style,
      compactStyle,
    }: renderRowProps) => {
      return (
        <ReportTableRow
          item={item}
          balanceTypeOp={balanceTypeOp}
          groupBy={groupBy}
          mode={mode}
          filters={filters}
          startDate={data.startDate}
          endDate={data.endDate}
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
          renderRow={renderRow}
          compact={compact}
          style={style}
          compactStyle={compactStyle}
        />
      </Block>
    </View>
  );
}
