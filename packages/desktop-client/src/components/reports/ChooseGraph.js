import React from 'react';

import View from '../common/View';

import AreaGraph from './graphs/AreaGraph';
import BarGraph from './graphs/BarGraph';
import BarLineGraph from './graphs/BarLineGraph';
import DonutGraph from './graphs/DonutGraph';
import LineGraph from './graphs/LineGraph';
import StackedBarGraph from './graphs/StackedBarGraph';
import { ReportOptions } from './ReportOptions';
import SimpleTable, {
  TableHeader,
  TableList,
  TableTotals,
} from './ReportTable';

export function ChooseGraph({
  start,
  end,
  data,
  mode,
  graphType,
  type,
  split,
  empty,
  scrollWidth,
  setScrollWidth,
  months,
  OnChangeLegend,
}) {
  function saveScrollWidth(parent, child) {
    let width = parent > 0 && child > 0 && parent - child;

    setScrollWidth(!width ? 0 : width);
  }

  if (graphType === 'AreaGraph') {
    return (
      <AreaGraph
        style={{ flexGrow: 1 }}
        start={start}
        end={end}
        data={data}
        typeOp={ReportOptions.type.find(opt => opt.description === type).format}
      />
    );
  }
  if (graphType === 'BarGraph') {
    return (
      <BarGraph
        style={{ flexGrow: 1 }}
        start={start}
        end={end}
        data={data}
        split={split}
        empty={empty}
        OnChangeLegend={OnChangeLegend}
        typeOp={ReportOptions.type.find(opt => opt.description === type).format}
      />
    );
  }
  if (graphType === 'BarLineGraph') {
    return (
      <BarLineGraph
        style={{ flexGrow: 1 }}
        start={start}
        end={end}
        graphData={data.graphData}
      />
    );
  }
  if (graphType === 'DonutGraph') {
    return (
      <DonutGraph
        style={{ flexGrow: 1 }}
        start={start}
        end={end}
        data={data}
        split={split}
        empty={empty}
        OnChangeLegend={OnChangeLegend}
        typeOp={ReportOptions.type.find(opt => opt.description === type).format}
      />
    );
  }
  if (graphType === 'LineGraph') {
    return (
      <LineGraph
        style={{ flexGrow: 1 }}
        start={start}
        end={end}
        graphData={data.graphData}
      />
    );
  }
  if (graphType === 'StackedBarGraph') {
    return (
      <StackedBarGraph
        style={{ flexGrow: 1 }}
        start={start}
        end={end}
        data={data}
        typeOp={ReportOptions.type.find(opt => opt.description === type).format}
        OnChangeLegend={OnChangeLegend}
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
        <TableHeader
          interval={mode === 'time' && months}
          scrollWidth={scrollWidth}
          split={split}
          type={type}
        />
        <SimpleTable saveScrollWidth={saveScrollWidth}>
          <TableList
            data={data}
            empty={empty}
            monthsCount={months.length}
            typeOp={
              ReportOptions.type.find(opt => opt.description === type).format
            }
            mode={mode}
            split={split}
          />
          <TableTotals
            scrollWidth={scrollWidth}
            data={data}
            mode={mode}
            typeOp={
              ReportOptions.type.find(opt => opt.description === type).format
            }
            monthsCount={months.length}
            type={type}
          />
        </SimpleTable>
      </View>
    );
  }
}
