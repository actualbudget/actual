import React, { type UIEvent, useRef } from 'react';

import { type DataEntity } from 'loot-core/src/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { type CSSProperties } from '../../style';
import { styles } from '../../style/styles';

import { AreaGraph } from './graphs/AreaGraph';
import { BarGraph } from './graphs/BarGraph';
import { BarLineGraph } from './graphs/BarLineGraph';
import { DonutGraph } from './graphs/DonutGraph';
import { LineGraph } from './graphs/LineGraph';
import { StackedBarGraph } from './graphs/StackedBarGraph';
import { ReportTable } from './graphs/tableGraph/ReportTable';
import { ReportOptions } from './ReportOptions';

type ChooseGraphProps = {
  data: DataEntity;
  filters?: RuleConditionEntity[];
  mode: string;
  graphType: string;
  balanceType: string;
  groupBy: string;
  interval: string;
  setScrollWidth?: (value: number) => void;
  viewLabels?: boolean;
  compact: boolean;
  style?: CSSProperties;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showTooltip?: boolean;
  intervalsCount: number;
};

export function ChooseGraph({
  data,
  filters = [],
  mode,
  graphType,
  balanceType,
  groupBy,
  interval,
  setScrollWidth,
  viewLabels = false,
  compact,
  style,
  showHiddenCategories = false,
  showOffBudget = false,
  showTooltip = true,
  intervalsCount,
}: ChooseGraphProps) {
  const graphStyle = compact
    ? { ...style }
    : { flexGrow: 1, overflow: 'hidden' };
  const balanceTypeOp =
    ReportOptions.balanceTypeMap.get(balanceType) || 'totalDebts';

  const saveScrollWidth = (value: number) => {
    setScrollWidth?.(value || 0);
  };

  const rowStyle: CSSProperties = compact
    ? { flex: '0 0 20px', height: 20 }
    : {};
  const compactStyle: CSSProperties = compact ? { ...styles.tinyText } : {};

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const totalScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (scroll: UIEvent<HTMLDivElement>) => {
    if (
      scroll.currentTarget.id === 'header' &&
      totalScrollRef.current &&
      listScrollRef.current
    ) {
      totalScrollRef.current.scrollLeft = scroll.currentTarget.scrollLeft;
      listScrollRef.current.scrollLeft = scroll.currentTarget.scrollLeft;
    }
    if (
      scroll.currentTarget.id === 'total' &&
      headerScrollRef.current &&
      listScrollRef.current
    ) {
      headerScrollRef.current.scrollLeft = scroll.currentTarget.scrollLeft;
      listScrollRef.current.scrollLeft = scroll.currentTarget.scrollLeft;
    }
    if (
      scroll.currentTarget.id === 'list' &&
      totalScrollRef.current &&
      headerScrollRef.current
    ) {
      headerScrollRef.current.scrollLeft = scroll.currentTarget.scrollLeft;
      totalScrollRef.current.scrollLeft = scroll.currentTarget.scrollLeft;
    }
  };

  if (graphType === 'AreaGraph') {
    return (
      <AreaGraph
        style={graphStyle}
        compact={compact}
        data={data}
        balanceTypeOp={balanceTypeOp}
        viewLabels={viewLabels}
        showTooltip={showTooltip}
      />
    );
  }
  if (graphType === 'BarGraph') {
    return (
      <BarGraph
        style={graphStyle}
        compact={compact}
        data={data}
        filters={filters}
        groupBy={groupBy}
        balanceTypeOp={balanceTypeOp}
        viewLabels={viewLabels}
        showHiddenCategories={showHiddenCategories}
        showOffBudget={showOffBudget}
        showTooltip={showTooltip}
      />
    );
  }
  if (graphType === 'BarLineGraph') {
    return (
      <BarLineGraph
        style={graphStyle}
        compact={compact}
        data={data}
        showTooltip={showTooltip}
      />
    );
  }
  if (graphType === 'DonutGraph') {
    return (
      <DonutGraph
        style={graphStyle}
        compact={compact}
        data={data}
        filters={filters}
        groupBy={groupBy}
        balanceTypeOp={balanceTypeOp}
        viewLabels={viewLabels}
        showHiddenCategories={showHiddenCategories}
        showOffBudget={showOffBudget}
      />
    );
  }
  if (graphType === 'LineGraph') {
    return (
      <LineGraph
        style={graphStyle}
        compact={compact}
        data={data}
        filters={filters}
        groupBy={groupBy}
        balanceTypeOp={balanceTypeOp}
        showHiddenCategories={showHiddenCategories}
        showOffBudget={showOffBudget}
        showTooltip={showTooltip}
        interval={interval}
      />
    );
  }
  if (graphType === 'StackedBarGraph') {
    return (
      <StackedBarGraph
        style={graphStyle}
        compact={compact}
        data={data}
        filters={filters}
        viewLabels={viewLabels}
        balanceTypeOp={balanceTypeOp}
        groupBy={groupBy}
        showHiddenCategories={showHiddenCategories}
        showOffBudget={showOffBudget}
        showTooltip={showTooltip}
        interval={interval}
      />
    );
  }
  if (graphType === 'TableGraph') {
    return (
      <ReportTable
        saveScrollWidth={saveScrollWidth}
        headerScrollRef={headerScrollRef}
        listScrollRef={listScrollRef}
        totalScrollRef={totalScrollRef}
        handleScroll={handleScroll}
        balanceTypeOp={balanceTypeOp}
        groupBy={groupBy}
        data={data}
        filters={filters}
        mode={mode}
        intervalsCount={intervalsCount}
        interval={interval}
        compact={compact}
        style={rowStyle}
        compactStyle={compactStyle}
        showHiddenCategories={showHiddenCategories}
        showOffBudget={showOffBudget}
      />
    );
  }
  return null;
}
