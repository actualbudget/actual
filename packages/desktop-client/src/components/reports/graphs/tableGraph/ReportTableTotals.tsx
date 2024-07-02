import React, {
  type ReactNode,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react';

import {
  type GroupedEntity,
  type DataEntity,
} from 'loot-core/src/types/models/reports';

import { theme } from '../../../../style';
import { styles } from '../../../../style/styles';
import { type CSSProperties } from '../../../../style/types';
import { View } from '../../../common/View';

import { type renderTotalsProps } from './ReportTable';

type RenderTotalsRowProps = {
  metadata: GroupedEntity;
  mode: string;
  totalsStyle: CSSProperties;
  testStyle: CSSProperties;
  scrollWidthTotals: number;
  renderTotals: (arg: renderTotalsProps) => ReactNode;
};
function RenderTotalsRow({
  metadata,
  mode,
  totalsStyle,
  testStyle,
  scrollWidthTotals,
  renderTotals,
}: RenderTotalsRowProps) {
  return (
    <View>
      {renderTotals({
        metadata,
        mode,
        totalsStyle,
        testStyle,
        scrollWidthTotals,
      })}
    </View>
  );
}

type ReportTableTotalsProps = {
  data: DataEntity;
  mode: string;
  totalScrollRef: RefObject<HTMLDivElement>;
  compact: boolean;
  style?: CSSProperties;
  renderTotals: (arg: renderTotalsProps) => ReactNode;
};

export function ReportTableTotals({
  data,
  mode,
  totalScrollRef,
  compact,
  style,
  renderTotals,
}: ReportTableTotalsProps) {
  const [scrollWidthTotals, setScrollWidthTotals] = useState(0);

  useLayoutEffect(() => {
    if (totalScrollRef.current) {
      const [parent, child] = [
        totalScrollRef.current.offsetParent
          ? (totalScrollRef.current.parentElement
              ? totalScrollRef.current.parentElement.scrollHeight
              : 0) || 0
          : 0,
        totalScrollRef.current ? totalScrollRef.current.scrollHeight : 0,
      ];
      setScrollWidthTotals(parent > 0 && child > 0 ? parent - child : 0);
    }
  });

  const metadata: GroupedEntity = {
    id: '',
    name: 'Totals',
    intervalData: data.intervalData,
    totalAssets: data.totalAssets,
    totalDebts: data.totalDebts,
    netAssets: data.netAssets,
    netDebts: data.netDebts,
    totalTotals: data.totalTotals,
  };

  const totalsStyle: CSSProperties = {
    borderTopWidth: 1,
    borderColor: theme.tableBorder,
    justifyContent: 'center',
    color: theme.tableHeaderText,
    backgroundColor: theme.tableHeaderBackground,
    fontWeight: 600,
    ...style,
  };

  const testStyle: CSSProperties = {
    overflowX: 'auto',
    scrollbarWidth: compact ? 'none' : 'inherit',
    ...styles.horizontalScrollbar,
    '::-webkit-scrollbar': {
      backgroundColor: theme.tableBackground,
      height: 12,
      dispaly: compact && 'none',
    },
    flexDirection: 'row',
    flex: 1,
  };

  return (
    <RenderTotalsRow
      metadata={metadata}
      mode={mode}
      totalsStyle={totalsStyle}
      testStyle={testStyle}
      scrollWidthTotals={scrollWidthTotals}
      renderTotals={renderTotals}
    />
  );
}
