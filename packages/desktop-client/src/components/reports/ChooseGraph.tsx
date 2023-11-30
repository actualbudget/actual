import React, { useRef } from 'react';

import View from '../common/View';

import AreaGraph from './graphs/AreaGraph';
import BarGraph from './graphs/BarGraph';
import BarLineGraph from './graphs/BarLineGraph';
import DonutGraph from './graphs/DonutGraph';
import LineGraph from './graphs/LineGraph';
import StackedBarGraph from './graphs/StackedBarGraph';
import { ReportOptions } from './ReportOptions';
import ReportTable from './ReportTable';
import ReportTableHeader from './ReportTableHeader';
import ReportTableList from './ReportTableList';
import ReportTableTotals from './ReportTableTotals';

export function ChooseGraph({
  data,
  mode,
  graphType,
  balanceType,
  groupBy,
  empty,
  scrollWidth,
  setScrollWidth,
  months,
}) {
  function saveScrollWidth(parent, child) {
    let width = parent > 0 && child > 0 && parent - child;

    setScrollWidth(!width ? 0 : width);
  }

  let headerScrollRef = useRef<HTMLDivElement>(null);
  let listScrollRef = useRef<HTMLDivElement>(null);
  let totalScrollRef = useRef<HTMLDivElement>(null);

  const handleScrollTotals = scroll => {
    headerScrollRef.current.scrollLeft = scroll.target.scrollLeft;
    listScrollRef.current.scrollLeft = scroll.target.scrollLeft;
  };

  if (graphType === 'AreaGraph') {
    return (
      <AreaGraph
        style={{ flexGrow: 1 }}
        data={data}
        balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
      />
    );
  }
  if (graphType === 'BarGraph') {
    return (
      <BarGraph
        style={{ flexGrow: 1 }}
        data={data}
        groupBy={groupBy}
        empty={empty}
        balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
      />
    );
  }
  if (graphType === 'BarLineGraph') {
    return <BarLineGraph style={{ flexGrow: 1 }} graphData={data.graphData} />;
  }
  if (graphType === 'DonutGraph') {
    return (
      <DonutGraph
        style={{ flexGrow: 1 }}
        data={data}
        groupBy={groupBy}
        empty={empty}
        balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
      />
    );
  }
  if (graphType === 'LineGraph') {
    return <LineGraph style={{ flexGrow: 1 }} graphData={data.graphData} />;
  }
  if (graphType === 'StackedBarGraph') {
    return <StackedBarGraph style={{ flexGrow: 1 }} data={data} />;
  }
  if (graphType === 'TableGraph') {
    return (
      <View>
        <ReportTableHeader
          headerScrollRef={headerScrollRef}
          interval={mode === 'time' && months}
          scrollWidth={scrollWidth}
          groupBy={groupBy}
          balanceType={balanceType}
        />
        <ReportTable
          saveScrollWidth={saveScrollWidth}
          listScrollRef={listScrollRef}
        >
          <ReportTableList
            data={data}
            empty={empty}
            monthsCount={months.length}
            balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
            mode={mode}
            groupBy={groupBy}
          />
        </ReportTable>
        <ReportTableTotals
          totalScrollRef={totalScrollRef}
          handleScrollTotals={handleScrollTotals}
          scrollWidth={scrollWidth}
          data={data}
          mode={mode}
          balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
          monthsCount={months.length}
        />
      </View>
    );
  }
}
