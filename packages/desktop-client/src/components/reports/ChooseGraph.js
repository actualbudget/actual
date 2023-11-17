import React from 'react';

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
  start,
  end,
  compact,
  style,
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
  const graphStyle = compact ? { ...style } : { flexGrow: 1 };

  function saveScrollWidth(parent, child) {
    let width = parent > 0 && child > 0 && parent - child;

    setScrollWidth(!width ? 0 : width);
  }

  if (graphType === 'AreaGraph') {
    return (
      <AreaGraph
        style={graphStyle}
        compact={compact}
        start={start}
        end={end}
        data={data}
        balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
      />
    );
  }
  if (graphType === 'BarGraph') {
    return (
      <BarGraph
        style={graphStyle}
        compact={compact}
        start={start}
        end={end}
        data={data}
        groupBy={groupBy}
        empty={empty}
        balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
      />
    );
  }
  if (graphType === 'BarLineGraph') {
    return (
      <BarLineGraph
        style={graphStyle}
        compact={compact}
        start={start}
        end={end}
        graphData={data}
      />
    );
  }
  if (graphType === 'DonutGraph') {
    return (
      <DonutGraph
        style={graphStyle}
        compact={compact}
        start={start}
        end={end}
        data={data}
        groupBy={groupBy}
        empty={empty}
        balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
      />
    );
  }
  if (graphType === 'LineGraph') {
    return (
      <LineGraph
        style={graphStyle}
        compact={compact}
        start={start}
        end={end}
        graphData={data}
      />
    );
  }
  if (graphType === 'StackedBarGraph') {
    return (
      <StackedBarGraph
        style={graphStyle}
        compact={compact}
        start={start}
        end={end}
        data={data}
        balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
      />
    );
  }
  if (graphType === 'TableGraph') {
    return (
      <View
        style={{
          overflow: 'auto',
        }}
      >
        <ReportTableHeader
          interval={mode === 'time' && months}
          scrollWidth={scrollWidth}
          groupBy={groupBy}
          balanceType={balanceType}
        />
        <ReportTable saveScrollWidth={saveScrollWidth}>
          <ReportTableList
            data={data}
            empty={empty}
            monthsCount={months.length}
            balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
            mode={mode}
            groupBy={groupBy}
          />
          <ReportTableTotals
            scrollWidth={scrollWidth}
            data={data}
            mode={mode}
            balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
            monthsCount={months.length}
            balanceType={balanceType}
          />
        </ReportTable>
      </View>
    );
  }
}
