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

export function CustomTopbar({
  graphType,
  setGraphType,
  mode,
  viewSplit,
  setViewSplit,
  setTypeDisabled,
  type,
  setType,
  split,
  setSplit,
  viewSummary,
  setViewSummary,
  showLabels,
  setShowLabels,
  onApplyFilter,
}) {
  function GraphButton({
    selected,
    children,
    style,
    onSelect,
    title,
    disabled,
  }) {
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
          setViewSplit(false);
          setTypeDisabled([0]);
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
            // eslint-disable-next-line rulesdir/prefer-if-statement
            [3].includes(type) && setType(1);
            setTypeDisabled([5, 6].includes(split) ? [0] : [3]);
          } else {
            setGraphType('StackedBarGraph');
            setTypeDisabled([3]);
            setType(1);
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
          setSplit(5);
          setViewSplit(false);
          setTypeDisabled([0]);
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
          setTypeDisabled([3]);
          setType(1);
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
        selected={viewSplit}
        onSelect={() => {
          setViewSplit(!viewSplit);
        }}
        style={{ marginLeft: 15 }}
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
          setViewSummary(!viewSummary);
        }}
        style={{ marginLeft: 15 }}
        title="Show Summary"
      >
        <Calculator width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={showLabels}
        onSelect={() => {
          setShowLabels(!showLabels);
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
          marginLeft: 15,
          flexShrink: 0,
        }}
      />
      <FilterButton onApply={onApplyFilter} type="reports" />
      <View style={{ flex: 1 }} />
      <SaveReportMenuButton />
    </View>
  );
}
