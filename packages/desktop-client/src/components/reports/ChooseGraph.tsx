import React, { useRef } from 'react';

import View from '../common/View';

import { type DataEntity, type Month } from './entities';
import AreaGraph from './graphs/AreaGraph';
import BarGraph from './graphs/BarGraph';
import BarLineGraph from './graphs/BarLineGraph';
import DonutGraph from './graphs/DonutGraph';
import LineGraph from './graphs/LineGraph';
import StackedBarGraph from './graphs/StackedBarGraph';
import { ReportOptions } from './ReportOptions';
import ReportTable from './ReportTable';
import ReportTableHeader from './ReportTableHeader';
import ReportTableTotals from './ReportTableTotals';

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
};

function ChooseGraph({
  data,
  mode,
  graphType,
  balanceType,
  groupBy,
  showEmpty,
  scrollWidth,
  setScrollWidth,
  months,
}: ChooseGraphProps) {
  const balanceTypeOp = ReportOptions.balanceTypeMap.get(balanceType);
  const groupByData =
    groupBy === 'Category'
      ? 'groupedData'
      : ['Month', 'Year'].includes(groupBy)
      ? 'monthData'
      : 'data';

  const filteredData =
    data[groupByData] &&
    data[groupByData].filter(i =>
      !showEmpty
        ? balanceTypeOp === 'totalTotals'
          ? i.totalAssets !== 0 || i.totalDebts !== 0 || i.totalTotals !== 0
          : i[balanceTypeOp] !== 0
        : true,
    );

  const saveScrollWidth = value => {
    setScrollWidth(!value ? 0 : value);
  };

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const totalScrollRef = useRef<HTMLDivElement>(null);
  const indexScrollRef = useRef<HTMLDivElement>(null);
  const scrollScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = scroll => {
    if (scroll.target.id === 'total') {
      headerScrollRef.current.scrollLeft = scroll.target.scrollLeft;
      listScrollRef.current.scrollLeft = scroll.target.scrollLeft;
    }
    if (scroll.target.id === 'header') {
      totalScrollRef.current.scrollLeft = scroll.target.scrollLeft;
      listScrollRef.current.scrollLeft = scroll.target.scrollLeft;
    }
    if (scroll.target.id === 'list') {
      if (headerScrollRef.current.scrollLeft !== scroll.target.scrollLeft) {
        headerScrollRef.current.scrollLeft = scroll.target.scrollLeft;
        totalScrollRef.current.scrollLeft = scroll.target.scrollLeft;
      } else {
        indexScrollRef.current.scrollTop = scroll.target.scrollTop;
        scrollScrollRef.current.scrollTop = scroll.target.scrollTop;
      }
    }
    if (scroll.target.id === 'index') {
      listScrollRef.current.scrollTop = scroll.target.scrollTop;
      scrollScrollRef.current.scrollTop = scroll.target.scrollTop;
    }
  };

  if (graphType === 'AreaGraph') {
    return (
      <AreaGraph
        style={{ flexGrow: 1 }}
        data={data}
        balanceTypeOp={balanceTypeOp}
      />
    );
  }
  if (graphType === 'BarGraph') {
    return (
      <BarGraph
        style={{ flexGrow: 1 }}
        data={data}
        groupBy={groupBy}
        showEmpty={showEmpty}
        balanceTypeOp={balanceTypeOp}
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
        showEmpty={showEmpty}
        balanceTypeOp={balanceTypeOp}
      />
    );
  }
  if (graphType === 'LineGraph') {
    return <LineGraph style={{ flexGrow: 1 }} graphData={data} />;
  }
  if (graphType === 'StackedBarGraph') {
    return <StackedBarGraph style={{ flexGrow: 1 }} data={data} />;
  }
  if (graphType === 'TableGraph') {
    return (
      <View>
        <ReportTableHeader
          headerScrollRef={headerScrollRef}
          handleScroll={handleScroll}
          interval={mode === 'time' && months}
          scrollWidth={scrollWidth}
          groupBy={groupBy}
          balanceType={balanceType}
        />
        <ReportTable
          saveScrollWidth={saveScrollWidth}
          listScrollRef={listScrollRef}
          indexScrollRef={indexScrollRef}
          scrollScrollRef={scrollScrollRef}
          handleScroll={handleScroll}
          balanceTypeOp={balanceTypeOp}
          groupBy={groupBy}
          data={filteredData}
          showEmpty={showEmpty}
          mode={mode}
          monthsCount={months.length}
        />
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

export default ChooseGraph;
