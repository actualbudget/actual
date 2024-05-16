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

import { ReportTableHeader } from './ReportTableHeader';
import { ReportTableList } from './ReportTableList';
import { ReportTableRow } from './ReportTableRow';
import { ReportTableTotals } from './ReportTableTotals';

type ReportTableProps = {
  saveScrollWidth: (value: number) => void;
  headerScrollRef: RefObject<HTMLDivElement>;
  listScrollRef: RefObject<HTMLDivElement>;
  totalScrollRef: RefObject<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  groupBy: string;
  balanceTypeOp: 'totalDebts' | 'totalTotals' | 'totalAssets';
  data: DataEntity;
  filters?: RuleConditionEntity[];
  mode: string;
  intervalsCount: number;
  interval: string;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export type renderTotalsProps = {
  metadata: GroupedEntity;
  mode: string;
  totalsStyle: CSSProperties;
  testStyle: CSSProperties;
  scrollWidthTotals: number;
};

export type renderRowProps = {
  item: GroupedEntity;
  mode: string;
  style?: CSSProperties;
};

export function ReportTable({
  saveScrollWidth,
  headerScrollRef,
  listScrollRef,
  totalScrollRef,
  handleScroll,
  groupBy,
  balanceTypeOp,
  data,
  filters,
  mode,
  intervalsCount,
  interval,
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

  const renderRow = useCallback(({ item, mode, style }: renderRowProps) => {
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
  }, []);

  const renderTotals = useCallback(
    ({
      metadata,
      mode,
      totalsStyle,
      testStyle,
      scrollWidthTotals,
    }: renderTotalsProps) => {
      return (
        <ReportTableRow
          item={metadata}
          balanceTypeOp={balanceTypeOp}
          groupBy={groupBy}
          mode={mode}
          filters={filters}
          startDate={data.startDate}
          endDate={data.endDate}
          intervalsCount={intervalsCount}
          compact={compact}
          style={totalsStyle}
          compactStyle={compactStyle}
          showHiddenCategories={showHiddenCategories}
          showOffBudget={showOffBudget}
          totalStyle={testStyle}
          totalScrollRef={totalScrollRef}
          handleScroll={handleScroll}
          height={32 + scrollWidthTotals}
        />
      );
    },
    [],
  );

  return (
    <View>
      <ReportTableHeader
        headerScrollRef={headerScrollRef}
        handleScroll={handleScroll}
        data={data.intervalData}
        groupBy={groupBy}
        interval={interval}
        balanceTypeOp={balanceTypeOp}
        compact={compact}
        style={style}
        compactStyle={compactStyle}
        mode={mode}
      />
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
            mode={mode}
            groupBy={groupBy}
            renderRow={renderRow}
            style={style}
          />
        </Block>
      </View>
      <ReportTableTotals
        data={data}
        mode={mode}
        totalScrollRef={totalScrollRef}
        compact={compact}
        style={style}
        renderTotals={renderTotals}
      />
    </View>
  );
}
