// @ts-strict-ignore
import React, { useRef } from 'react';

import { View } from '../common/View';

import { type DataEntity, type Month } from './entities';
import { AreaGraph } from './graphs/AreaGraph';
import { BarGraph } from './graphs/BarGraph';
import { BarLineGraph } from './graphs/BarLineGraph';
import { DonutGraph } from './graphs/DonutGraph';
import { LineGraph } from './graphs/LineGraph';
import { StackedBarGraph } from './graphs/StackedBarGraph';
import { ReportTable } from './graphs/tableGraph/ReportTable';
import { ReportTableHeader } from './graphs/tableGraph/ReportTableHeader';
import { ReportTableList } from './graphs/tableGraph/ReportTableList';
import { ReportTableTotals } from './graphs/tableGraph/ReportTableTotals';
import { ReportOptions } from './ReportOptions';

type ChooseGraphProps = {
  data: DataEntity;
  mode: string;
  graphType: string;
  balanceType: string;
  groupBy: string;
  showEmpty: boolean;
  scrollWidth: number;
  setScrollWidth: (value: number) => void;
  months: Month[];
  viewLabels: boolean;
};

export function ChooseGraph({
  data,
  mode,
  graphType,
  balanceType,
  groupBy,
  showEmpty,
  scrollWidth,
  setScrollWidth,
  months,
  viewLabels,
}: ChooseGraphProps) {
  const balanceTypeOp = ReportOptions.balanceTypeMap.get(balanceType);

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
        style={{ flexGrow: 1 }}
        data={data}
        balanceTypeOp={balanceTypeOp}
        viewLabels={viewLabels}
      />
    );
  }
  if (graphType === 'BarGraph') {
    return (
      <BarGraph
        style={{ flexGrow: 1 }}
        data={data}
        groupBy={groupBy}
        balanceTypeOp={balanceTypeOp}
        viewLabels={viewLabels}
      />
    );
  }
  if (graphType === 'BarLineGraph') {
    return <BarLineGraph style={{ flexGrow: 1 }} graphData={data} />;
  }
  if (graphType === 'DonutGraph') {
    return (
      <DonutGraph
        style={{ flexGrow: 1 }}
        data={data}
        groupBy={groupBy}
        balanceTypeOp={balanceTypeOp}
        viewLabels={viewLabels}
      />
    );
  }
  if (graphType === 'LineGraph') {
    return <LineGraph style={{ flexGrow: 1 }} graphData={data} />;
  }
  if (graphType === 'StackedBarGraph') {
    return (
      <StackedBarGraph
        style={{ flexGrow: 1 }}
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
          scrollWidth={scrollWidth}
          groupBy={groupBy}
          balanceType={balanceType}
        />
        <ReportTable
          saveScrollWidth={saveScrollWidth}
          listScrollRef={listScrollRef}
          handleScroll={handleScroll}
        >
          <ReportTableList
            data={data}
            empty={showEmpty}
            monthsCount={months.length}
            balanceTypeOp={balanceTypeOp}
            mode={mode}
            groupBy={groupBy}
          />
        </ReportTable>
        <ReportTableTotals
          totalScrollRef={totalScrollRef}
          handleScroll={handleScroll}
          scrollWidth={scrollWidth}
          data={data}
          mode={mode}
          balanceTypeOp={balanceTypeOp}
          monthsCount={months.length}
        />
      </View>
    );
  }
}
