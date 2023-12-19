import React from 'react';

import Calculator from '../../icons/v1/Calculator';
import Chart from '../../icons/v1/Chart';
import ChartBar from '../../icons/v1/ChartBar';
import ChartPie from '../../icons/v1/ChartPie';
import ListBullet from '../../icons/v1/ListBullet';
import Queue from '../../icons/v1/Queue';
import Tag from '../../icons/v1/Tag';
import { theme } from '../../style';
import View from '../common/View';
import { FilterButton } from '../filters/FiltersMenu';

import GraphButton from './GraphButton';
import { SaveReportMenuButton } from './SaveReport';

export function ReportTopbar({
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
        <Queue width={15} height={15} />
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
        <ChartBar width={15} height={15} />
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
        <Chart width={15} height={15} />
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
        <ChartPie width={15} height={15} />
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
        <ListBullet width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={viewSummary}
        onSelect={() => {
          onChangeViews('viewSummary');
        }}
        style={{ marginRight: 15 }}
        title="Show Summary"
      >
        <Calculator width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={viewLabels}
        onSelect={() => {
          onChangeViews('viewLabels');
        }}
        style={{ marginRight: 15 }}
        title="Show labels"
        disabled={true}
      >
        <Tag width={15} height={15} />
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
      <SaveReportMenuButton />
    </View>
  );
}
