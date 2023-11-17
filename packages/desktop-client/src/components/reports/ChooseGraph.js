import React from 'react';

import AreaGraph from './graphs/AreaGraph';
import BarGraph from './graphs/BarGraph';
import BarLineGraph from './graphs/BarLineGraph';
import DonutGraph from './graphs/DonutGraph';
import LineGraph from './graphs/LineGraph';
import StackedBarGraph from './graphs/StackedBarGraph';
import TableGraph from './graphs/TableGraph';
import { ReportOptions } from './ReportOptions';

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
}) {
  const graphStyle = compact ? { ...style } : { flexGrow: 1 };

  function saveScrollWidth(parent, child) {
    let width = parent > 0 && child > 0 && parent - child;
    if (setScrollWidth) {
      setScrollWidth(!width ? 0 : width);
    }
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
      <TableGraph
        mode={mode}
        start={start}
        end={end}
        scrollWidth={scrollWidth}
        saveScrollWidth={saveScrollWidth}
        balanceType={balanceType}
        style={style}
        data={data}
        groupBy={groupBy}
        empty={empty}
        compact={compact}
      />
    );
  }
}
