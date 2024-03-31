import React from 'react';

import {
  SvgCalculator,
  SvgChartBar,
  SvgChartPie,
  SvgListBullet,
  SvgQueue,
  SvgTag,
} from '../../icons/v1';
import { SvgChartArea } from '../../icons/v1/ChartArea';
import { theme } from '../../style';
import { View } from '../common/View';
import { FilterButton } from '../filters/FiltersMenu';

import { GraphButton } from './GraphButton';
import { SaveReport } from './SaveReport';

export function ReportTopbar({
  customReportItems,
  report,
  savedStatus,
  setGraphType,
  viewLegend,
  viewSummary,
  viewLabels,
  onApplyFilter,
  onChangeViews,
  onReportChange,
  disabledItems,
  defaultItems,
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        flexShrink: 0,
      }}
    >
      <GraphButton
        selected={customReportItems.graphType === 'TableGraph'}
        title="Data Table"
        onSelect={() => {
          onReportChange({ type: 'modify' });
          setGraphType('TableGraph');
          defaultItems('TableGraph');
        }}
        style={{ marginRight: 15 }}
        disabled={disabledItems('TableGraph')}
      >
        <SvgQueue width={15} height={15} />
      </GraphButton>
      <GraphButton
        title={
          customReportItems.mode === 'total' ? 'Bar Graph' : 'Stacked Bar Graph'
        }
        selected={
          customReportItems.graphType === 'BarGraph' ||
          customReportItems.graphType === 'StackedBarGraph'
        }
        onSelect={() => {
          onReportChange({ type: 'modify' });
          setGraphType(
            customReportItems.mode === 'total' ? 'BarGraph' : 'StackedBarGraph',
          );
          defaultItems(
            customReportItems.mode === 'total' ? 'BarGraph' : 'StackedBarGraph',
          );
        }}
        style={{ marginRight: 15 }}
        disabled={disabledItems(
          customReportItems.mode === 'total' ? 'BarGraph' : 'StackedBarGraph',
        )}
      >
        <SvgChartBar width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Line Graph"
        selected={customReportItems.graphType === 'LineGraph'}
        onSelect={() => {
          onReportChange({ type: 'modify' });
          setGraphType('LineGraph');
          defaultItems('LineGraph');
        }}
        style={{ marginRight: 15 }}
        disabled={disabledItems('LineGraph')}
      >
        <SvgChart width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Area Graph"
        selected={customReportItems.graphType === 'AreaGraph'}
        onSelect={() => {
          onReportChange({ type: 'modify' });
          setGraphType('AreaGraph');
          defaultItems('AreaGraph');
        }}
        style={{ marginRight: 15 }}
        disabled={disabledItems('AreaGraph')}
      >
        <SvgChartArea width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Donut Graph"
        selected={customReportItems.graphType === 'DonutGraph'}
        onSelect={() => {
          onReportChange({ type: 'modify' });
          setGraphType('DonutGraph');
          defaultItems('DonutGraph');
        }}
        style={{ marginRight: 15 }}
        disabled={disabledItems('DonutGraph')}
      >
        <SvgChartPie width={15} height={15} />
      </GraphButton>
      <View
        style={{
          width: 1,
          height: 30,
          backgroundColor: theme.pillBorderDark,
          marginRight: 15,
          flexShrink: 0,
        }}
      />
      <GraphButton
        selected={viewLegend}
        onSelect={() => {
          onChangeViews('viewLegend');
        }}
        style={{ marginRight: 15 }}
        title="Show Legend"
        disabled={disabledItems('ShowLegend')}
      >
        <SvgListBullet width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={viewSummary}
        onSelect={() => {
          onChangeViews('viewSummary');
        }}
        style={{ marginRight: 15 }}
        title="Show Summary"
      >
        <SvgCalculator width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={viewLabels}
        onSelect={() => {
          onChangeViews('viewLabels');
        }}
        style={{ marginRight: 15 }}
        title="Show Labels"
        disabled={disabledItems('ShowLabels')}
      >
        <SvgTag width={15} height={15} />
      </GraphButton>
      <View
        style={{
          width: 1,
          height: 30,
          backgroundColor: theme.pillBorderDark,
          marginRight: 15,
          flexShrink: 0,
        }}
      />{' '}
      <FilterButton
        compact
        hover
        onApply={e => {
          onApplyFilter(e);
          onReportChange({ type: 'modify' });
        }}
      />
      <View style={{ flex: 1 }} />
      <SaveReport
        customReportItems={customReportItems}
        report={report}
        savedStatus={savedStatus}
        onReportChange={onReportChange}
      />
    </View>
  );
}
