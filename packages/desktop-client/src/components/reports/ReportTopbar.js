import React from 'react';

import Calculator from '../../icons/v1/Calculator';
import Chart from '../../icons/v1/Chart';
import ChartBar from '../../icons/v1/ChartBar';
import ChartPie from '../../icons/v1/ChartPie';
import ListBullet from '../../icons/v1/ListBullet';
import Queue from '../../icons/v1/Queue';
import Tag from '../../icons/v1/Tag';
import { theme } from '../../style';
import Button from '../common/Button';
import View from '../common/View';
import { FilterButton } from '../filters/FiltersMenu';

import { SaveReportMenuButton } from './SaveReport';

function GraphButton({ selected, children, style, onSelect, title, disabled }) {
  return (
    <Button
      type="bare"
      style={{
        ...(selected && {
          backgroundColor: theme.buttonBareBackgroundHover,
        }),
        ...style,
      }}
      onClick={onSelect}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function ReportTopbar({
  start,
  end,
  mode,
  empty,
  hidden,
  uncat,
  graphType,
  setGraphType,
  viewLegend,
  setViewLegend,
  setTypeDisabled,
  balanceType,
  setBalanceType,
  groupBy,
  setGroupBy,
  viewSummary,
  setViewSummary,
  viewLabels,
  setViewLabels,
  onApplyFilter,
  filters,
  conditionsOp,
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
          //setViewLegend(false);
          setTypeDisabled([]);
        }}
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
              setBalanceType('Expense');
            }
            setTypeDisabled(['Month', 'Year'].includes(groupBy) ? [] : ['Net']);
          } else {
            setGraphType('StackedBarGraph');
            setTypeDisabled(['Net']);
            setBalanceType('Expense');
          }
        }}
        style={{ marginLeft: 15 }}
      >
        <ChartBar width={15} height={15} />
      </GraphButton>
      <GraphButton
        title="Area Graph"
        selected={graphType === 'AreaGraph'}
        onSelect={() => {
          setGraphType('AreaGraph');
          setGroupBy('Month');
          //setViewLegend(false);
          setTypeDisabled([]);
        }}
        style={{ marginLeft: 15 }}
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
          setBalanceType('Expense');
        }}
        style={{ marginLeft: 15 }}
        disabled={mode === 'total' ? false : true}
      >
        <ChartPie width={15} height={15} />
      </GraphButton>
      <View
        style={{
          width: 1,
          height: 30,
          backgroundColor: theme.altPillBorder,
          marginLeft: 15,
          flexShrink: 0,
        }}
      />
      <GraphButton
        selected={viewLegend}
        onSelect={() => {
          setViewLegend(!viewLegend);
        }}
        style={{ marginLeft: 15 }}
        title="Show Legend"
        disabled={
          true //descoping for future PR
          //graphType === 'TableGraph' || graphType === 'AreaGraph' ? true : false
        }
      >
        <ListBullet width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={viewSummary}
        onSelect={() => {
          setViewSummary(!viewSummary);
        }}
        style={{ marginLeft: 15 }}
        title="Show Summary"
      >
        <Calculator width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={viewLabels}
        onSelect={() => {
          setViewLabels(!viewLabels);
        }}
        style={{ marginLeft: 15 }}
        title="Show labels"
        disabled={true}
      >
        <Tag width={15} height={15} />
      </GraphButton>
      <View
        style={{
          width: 1,
          height: 30,
          backgroundColor: theme.altPillBorder,
          marginRight: 15,
          marginLeft: 15,
          flexShrink: 0,
        }}
      />
      <FilterButton onApply={onApplyFilter} type="reports" />
      <View style={{ flex: 1 }} />
      <SaveReportMenuButton
        reportId={reportId}
        start={start}
        end={end}
        filters={filters}
        conditionsOp={conditionsOp}
        onReportChange={onReportChange}
        onResetReports={onResetReports}
        mode={mode}
        groupBy={groupBy}
        balanceType={balanceType}
        empty={empty}
        hidden={hidden}
        uncat={uncat}
        graphType={graphType}
        viewLabels={viewLabels}
        viewLegend={viewLegend}
        viewSummary={viewSummary}
        data={data}
      />
    </View>
  );
}
