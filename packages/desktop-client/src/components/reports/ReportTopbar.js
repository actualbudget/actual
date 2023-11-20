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
import HoverTarget from '../common/HoverTarget';
import Text from '../common/Text';
import View from '../common/View';
import { FilterButton } from '../filters/FiltersMenu';
import { Tooltip } from '../tooltips';

import { SaveReportMenuButton } from './SaveReport';

function GraphButton({ selected, children, style, onSelect, title, disabled }) {
  return (
    <HoverTarget
      style={{ flexShrink: 0 }}
      renderContent={() => (
        <Tooltip
          position="bottom-left"
          style={{
            lineHeight: 1.5,
            padding: '6px 10px',
            backgroundColor: theme.menuAutoCompleteBackground,
            color: theme.menuAutoCompleteText,
          }}
        >
          <Text>{title}</Text>
        </Tooltip>
      )}
    >
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
    </HoverTarget>
  );
}

export function ReportTopbar({
  graphType,
  setGraphType,
  mode,
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
              setBalanceType('Expense');
            }
            setTypeDisabled(['Month', 'Year'].includes(groupBy) ? [] : ['Net']);
          } else {
            setGraphType('StackedBarGraph');
            setTypeDisabled(['Net']);
            setBalanceType('Expense');
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
          //setViewLegend(false);
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
          setBalanceType('Expense');
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
          setViewLegend(!viewLegend);
        }}
        style={{ marginRight: 15 }}
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
        style={{ marginRight: 15 }}
        title="Show Summary"
      >
        <Calculator width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={viewLabels}
        onSelect={() => {
          setViewLabels(!viewLabels);
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
      <HoverTarget
        style={{ flexShrink: 0 }}
        renderContent={() => (
          <Tooltip
            position="bottom-left"
            style={{
              lineHeight: 1.5,
              padding: '6px 10px',
              backgroundColor: theme.menuAutoCompleteBackground,
              color: theme.menuAutoCompleteText,
            }}
          >
            <Text>Filters</Text>
          </Tooltip>
        )}
      >
        <FilterButton onApply={onApplyFilter} type="reports" />
      </HoverTarget>
      <View style={{ flex: 1 }} />
      <SaveReportMenuButton />
    </View>
  );
}
