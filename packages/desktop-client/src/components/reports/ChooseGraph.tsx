// @ts-strict-ignore
import React, { useRef } from 'react';

import { type DataEntity } from 'loot-core/src/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { type CSSProperties } from '../../style';
import { styles } from '../../style/styles';
import { View } from '../common/View';

import { AreaGraph } from './graphs/AreaGraph';
import { BarGraph } from './graphs/BarGraph';
import { BarLineGraph } from './graphs/BarLineGraph';
import { DonutGraph } from './graphs/DonutGraph';
import { LineGraph } from './graphs/LineGraph';
import { StackedBarGraph } from './graphs/StackedBarGraph';
import { ReportTable } from './graphs/tableGraph/ReportTable';
import { ReportTableHeader } from './graphs/tableGraph/ReportTableHeader';
import { ReportTableTotals } from './graphs/tableGraph/ReportTableTotals';
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
  compact?: boolean;
  style?: CSSProperties;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  intervalsCount?: number;
};

export function ChooseGraph({
  data,
  filters,
  mode,
  graphType,
  balanceType,
  groupBy,
  interval,
  setScrollWidth,
  viewLabels,
  compact,
  style,
  showHiddenCategories,
  showOffBudget,
  intervalsCount,
}: ChooseGraphProps) {
  const graphStyle = compact ? { ...style } : { flexGrow: 1 };
  const balanceTypeOp = ReportOptions.balanceTypeMap.get(balanceType);

  const saveScrollWidth = value => {
    setScrollWidth(!value ? 0 : value);
  };

  const rowStyle = compact && { flex: '0 0 20px', height: 20 };
  const compactStyle = compact && { ...styles.tinyText };

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const totalScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = scroll => {
    if (scroll.target.id === 'header') {
      totalScrollRef.current.scrollLeft = scroll.target.scrollLeft;
      listScrollRef.current.scrollLeft = scroll.target.scrollLeft;
    }
    if (scroll.target.id === 'total') {
      headerScrollRef.current.scrollLeft = scroll.target.scrollLeft;
      listScrollRef.current.scrollLeft = scroll.target.scrollLeft;
    }
    if (scroll.target.id === 'list') {
      headerScrollRef.current.scrollLeft = scroll.target.scrollLeft;
      totalScrollRef.current.scrollLeft = scroll.target.scrollLeft;
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
      />
    );
  }
  if (graphType === 'BarLineGraph') {
    return <BarLineGraph style={graphStyle} compact={compact} data={data} />;
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
      />
    );
  }
  if (graphType === 'TableGraph') {
    return (
      <View>
        <ReportTableHeader
          headerScrollRef={headerScrollRef}
          handleScroll={handleScroll}
          data={data.intervalData}
          groupBy={groupBy}
          interval={interval}
          balanceType={balanceType}
          compact={compact}
          style={rowStyle}
          compactStyle={compactStyle}
          mode={mode}
        />
        <ReportTable
          saveScrollWidth={saveScrollWidth}
          listScrollRef={listScrollRef}
          handleScroll={handleScroll}
          balanceTypeOp={balanceTypeOp}
          groupBy={groupBy}
          data={data}
          filters={filters}
          mode={mode}
          intervalsCount={intervalsCount}
          compact={compact}
          style={rowStyle}
          compactStyle={compactStyle}
          showHiddenCategories={showHiddenCategories}
          showOffBudget={showOffBudget}
        />
        <ReportTableTotals
          totalScrollRef={totalScrollRef}
          handleScroll={handleScroll}
          data={data}
          mode={mode}
          balanceTypeOp={balanceTypeOp}
          intervalsCount={intervalsCount}
          compact={compact}
          style={rowStyle}
          compactStyle={compactStyle}
          groupBy={groupBy}
          filters={filters}
          showHiddenCategories={showHiddenCategories}
          showOffBudget={showOffBudget}
        />
      </View>
    );
  }
  return null;
}
