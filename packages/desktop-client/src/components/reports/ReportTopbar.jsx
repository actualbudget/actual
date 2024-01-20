import React from 'react';

import {
  SvgCalculator,
  SvgChart,
  SvgChartBar,
  SvgChartPie,
  SvgListBullet,
  SvgQueue,
  SvgTag,
} from '../../icons/v1';
import { theme } from '../../style';
import { View } from '../common/View';
import { FilterButton } from '../filters/FiltersMenu';

import { GraphButton } from './GraphButton';
import { SaveReport, SaveReportMenuButton } from './SaveReport';

export function ReportTopbar({
  customReportItems,
  report,
  savedStatus,
  setSavedStatus,
  setGraphType,
  setTypeDisabled,
  setBalanceType,
  setGroupBy,
  viewLegend,
  viewSummary,
  viewLabels,
  onApplyFilter,
  onChangeViews,
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
          setSavedStatus('changed');
          setGraphType('TableGraph');
          onChangeViews('viewLegend', false);
          setTypeDisabled([]);
        }}
        style={{ marginRight: 15 }}
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
          setSavedStatus('changed');
          if (customReportItems.mode === 'total') {
            setGraphType('BarGraph');
            if (['Net'].includes(customReportItems.balanceType)) {
              setBalanceType('Payment');
            }
            setTypeDisabled(
              ['Month', 'Year'].includes(customReportItems.groupBy)
                ? []
                : ['Net'],
            );
          } else {
            setGraphType('StackedBarGraph');
            setTypeDisabled(['Net']);
            setBalanceType('Payment');
          }
        }}
        style={{ marginRight: 15 }}
      >
        <SvgChartBar width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Area Graph"
        selected={customReportItems.graphType === 'AreaGraph'}
        onSelect={() => {
          setSavedStatus('changed');
          setGraphType('AreaGraph');
          setGroupBy('Month');
          onChangeViews('viewLegend', false);
          setTypeDisabled([]);
        }}
        style={{ marginRight: 15 }}
        disabled={customReportItems.mode === 'total' ? false : true}
      >
        <SvgChart width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Donut Graph"
        selected={customReportItems.graphType === 'DonutGraph'}
        onSelect={() => {
          setSavedStatus('changed');
          setGraphType('DonutGraph');
          setTypeDisabled(['Net']);
          setBalanceType('Payment');
        }}
        style={{ marginRight: 15 }}
        disabled={customReportItems.mode === 'total' ? false : true}
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
          setSavedStatus('changed');
          onChangeViews('viewLegend');
        }}
        style={{ marginRight: 15 }}
        title="Show Legend"
        disabled={
          customReportItems.graphType === 'TableGraph' ||
          customReportItems.graphType === 'AreaGraph'
            ? true
            : false
        }
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
      />
      <FilterButton onApply={onApplyFilter} compact hover />
      <View style={{ flex: 1 }} />
      <SaveReport
        customReportItems={customReportItems}
        report={report}
        savedStatus={savedStatus}
        setSavedStatus={setSavedStatus}
        onReportChange={onReportChange}
        onResetReports={onResetReports}
      />
    </View>
  );
}
