// @ts-strict-ignore
import React, { useRef } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { type CSSProperties } from '../../style';
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
  startDate: string;
  endDate: string;
  data: GroupedEntity;
  mode: string;
  graphType: string;
  balanceType: string;
  groupBy: string;
  setScrollWidth?: (value: number) => void;
  viewLabels?: boolean;
  compact?: boolean;
  style?: CSSProperties;
};

export function ChooseGraph({
  startDate,
  endDate,
  data,
  mode,
  graphType,
  balanceType,
  groupBy,
  setScrollWidth,
  viewLabels,
  compact,
  style,
}: ChooseGraphProps) {
  const months: string[] = monthUtils.rangeInclusive(startDate, endDate);
  const graphStyle = compact ? { ...style } : { flexGrow: 1 };
  const balanceTypeOp = ReportOptions.balanceTypeMap.get(balanceType);
  const groupByData =
    groupBy === 'Category'
      ? 'groupedData'
      : ['Month', 'Year'].includes(groupBy)
        ? 'monthData'
        : 'data';

  const saveScrollWidth = value => {
    setScrollWidth(!value ? 0 : value);
  };

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
        groupBy={groupBy}
        balanceTypeOp={balanceTypeOp}
        viewLabels={viewLabels}
      />
    );
  }
  if (graphType === 'BarLineGraph') {
    return (
      <BarLineGraph style={graphStyle} compact={compact} graphData={data} />
    );
  }
  if (graphType === 'DonutGraph') {
    return (
      <DonutGraph
        style={graphStyle}
        compact={compact}
        data={data}
        groupBy={groupBy}
        balanceTypeOp={balanceTypeOp}
        viewLabels={viewLabels}
      />
    );
  }
  if (graphType === 'LineGraph') {
    return <LineGraph style={graphStyle} compact={compact} graphData={data} />;
  }
  if (graphType === 'StackedBarGraph') {
    return (
      <StackedBarGraph
        style={graphStyle}
        compact={compact}
        data={data}
        viewLabels={viewLabels}
      />
    );
  }
  if (graphType === 'TableGraph') {
    return (
      <View>
        <ReportTableHeader
          headerScrollRef={headerScrollRef}
          handleScroll={handleScroll}
          interval={mode === 'time' && data.monthData}
          groupBy={groupBy}
          balanceType={balanceType}
          compact={compact}
        />
        <ReportTable
          saveScrollWidth={saveScrollWidth}
          listScrollRef={listScrollRef}
          handleScroll={handleScroll}
          balanceTypeOp={balanceTypeOp}
          groupBy={groupBy}
          data={data[groupByData]}
          mode={mode}
          monthsCount={months.length}
          compact={compact}
        />
        <ReportTableTotals
          totalScrollRef={totalScrollRef}
          handleScroll={handleScroll}
          data={data}
          mode={mode}
          balanceTypeOp={balanceTypeOp}
          monthsCount={months.length}
          compact={compact}
        />
      </View>
    );
  }
}
