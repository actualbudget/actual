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
import { SaveReport } from './SaveReport';

export function ReportTopbar({
  startDate,
  endDate,
  showEmpty,
  showOffBudgetHidden,
  showUncategorized,
  graphType,
  setGraphType,
  mode,
  viewLegend,
  setTypeDisabled,
  balanceType,
  setBalanceType,
  groupBy,
  setGroupBy,
  viewSummary,
  viewLabels,
  onApplyFilter,
  onChangeViews,
  filters,
  conditionsOp,
  selectedCategories,
  reportId,
  onReportChange,
  onResetReports,
  data,
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
        selected={graphType === 'TableGraph'}
        title="Data Table"
        onSelect={() => {
          setGraphType('TableGraph');
          onChangeViews('viewLegend', false);
          setTypeDisabled([]);
        }}
        style={{ marginRight: 15 }}
      >
        <SvgQueue width={15} height={15} />
      </GraphButton>
      <GraphButton
        title={mode === 'total' ? 'Bar Graph' : 'Stacked Bar Graph'}
        selected={graphType === 'BarGraph' || graphType === 'StackedBarGraph'}
        onSelect={() => {
          if (mode === 'total') {
            setGraphType('BarGraph');
            if (['Net'].includes(balanceType)) {
              setBalanceType('Payment');
            }
            setTypeDisabled(['Month', 'Year'].includes(groupBy) ? [] : ['Net']);
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
        selected={graphType === 'AreaGraph'}
        onSelect={() => {
          setGraphType('AreaGraph');
          setGroupBy('Month');
          onChangeViews('viewLegend', false);
          setTypeDisabled([]);
        }}
        style={{ marginRight: 15 }}
        disabled={mode === 'total' ? false : true}
      >
        <SvgChart width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Donut Graph"
        selected={graphType === 'DonutGraph'}
        onSelect={() => {
          setGraphType('DonutGraph');
          setTypeDisabled(['Net']);
          setBalanceType('Payment');
        }}
        style={{ marginRight: 15 }}
        disabled={mode === 'total' ? false : true}
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
        disabled={
          graphType === 'TableGraph' || graphType === 'AreaGraph' ? true : false
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
        reportId={reportId}
        startDate={startDate}
        endDate={endDate}
        filters={filters}
        conditionsOp={conditionsOp}
        selectedCategories={selectedCategories}
        onReportChange={onReportChange}
        onResetReports={onResetReports}
        mode={mode}
        groupBy={groupBy}
        balanceType={balanceType}
        showEmpty={showEmpty}
        showOffBudgetHidden={showOffBudgetHidden}
        showUncategorized={showUncategorized}
        graphType={graphType}
        viewLabels={viewLabels}
        viewLegend={viewLegend}
        viewSummary={viewSummary}
        data={data}
      />
    </View>
  );
}
