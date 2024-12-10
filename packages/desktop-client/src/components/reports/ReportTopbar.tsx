import React, { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

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
import { SpaceBetween } from '../common/SpaceBetween';
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
  onReportChange: ComponentProps<typeof SaveReport>['onReportChange'];
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
  const { t } = useTranslation();
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
        overflowY: 'auto',
      }}
    >
      <GraphButton
        selected={customReportItems.graphType === 'TableGraph'}
        title={t('Data Table')}
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
          customReportItems.mode === 'total'
            ? t('Bar Graph')
            : t('Stacked Bar Graph')
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
        title={t('Line Graph')}
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
        title={t('Area Graph')}
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
        title={t('Donut Graph')}
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
        title={t('Show Legend')}
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
        title={t('Show Summary')}
      >
        <SvgCalculator width={15} height={15} />
      </GraphButton>
      <GraphButton
        selected={viewLabels}
        onSelect={() => {
          onChangeViews('viewLabels');
        }}
        style={{ marginRight: 15 }}
        title={t('Show Labels')}
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
      />

      <SpaceBetween
        style={{
          flexWrap: 'nowrap',
          justifyContent: 'space-between',
          flex: 1,
        }}
      >
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
        <SaveReport
          customReportItems={customReportItems}
          report={report}
          savedStatus={savedStatus}
          onReportChange={onReportChange}
        />
      </SpaceBetween>
    </View>
  );
}
