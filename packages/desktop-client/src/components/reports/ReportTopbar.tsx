import React from 'react';

import { type CustomReportEntity } from 'loot-core/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import {
  SvgCalculator,
  SvgChart,
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
import { setSessionReport } from './setSessionReport';

type ReportTopbarProps = {
  customReportItems: CustomReportEntity;
  report: CustomReportEntity;
  savedStatus: string;
  setGraphType: (value: string) => void;
  viewLegend: boolean;
  viewSummary: boolean;
  viewLabels: boolean;
  onApplyFilter: (newFilter: RuleConditionEntity) => void;
  onChangeViews: (viewType: string) => void;
  onReportChange: ({
    savedReport,
    type,
  }: {
    savedReport?: CustomReportEntity;
    type: string;
  }) => void;
  isItemDisabled: (type: string) => boolean;
  defaultItems: (item: string) => void;
};

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
  isItemDisabled,
  defaultItems,
}: ReportTopbarProps) {
  const onChangeGraph = (cond: string) => {
    setSessionReport('graphType', cond);
    onReportChange({ type: 'modify' });
    setGraphType(cond);
    defaultItems(cond);
  };

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
          onChangeGraph('TableGraph');
        }}
        style={{ marginRight: 15 }}
        disabled={isItemDisabled('TableGraph')}
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
          onChangeGraph(
            customReportItems.mode === 'total' ? 'BarGraph' : 'StackedBarGraph',
          );
        }}
        style={{ marginRight: 15 }}
        disabled={isItemDisabled(
          customReportItems.mode === 'total' ? 'BarGraph' : 'StackedBarGraph',
        )}
      >
        <SvgChartBar width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Line Graph"
        selected={customReportItems.graphType === 'LineGraph'}
        onSelect={() => {
          onChangeGraph('LineGraph');
        }}
        style={{ marginRight: 15 }}
        disabled={isItemDisabled('LineGraph')}
      >
        <SvgChart width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Area Graph"
        selected={customReportItems.graphType === 'AreaGraph'}
        onSelect={() => {
          onChangeGraph('AreaGraph');
        }}
        style={{ marginRight: 15 }}
        disabled={isItemDisabled('AreaGraph')}
      >
        <SvgChartArea width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Donut Graph"
        selected={customReportItems.graphType === 'DonutGraph'}
        onSelect={() => {
          onChangeGraph('DonutGraph');
        }}
        style={{ marginRight: 15 }}
        disabled={isItemDisabled('DonutGraph')}
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
        disabled={isItemDisabled('ShowLegend')}
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
        disabled={isItemDisabled('ShowLabels')}
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
        onApply={(e: RuleConditionEntity) => {
          setSessionReport('conditions', [
            ...(customReportItems.conditions ?? []),
            e,
          ]);
          onApplyFilter(e);
          onReportChange({ type: 'modify' });
        }}
        exclude={[]}
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
