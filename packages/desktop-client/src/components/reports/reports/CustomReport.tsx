import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';
import { type CategoryEntity } from 'loot-core/types/models/category';
import {
  type balanceTypeOpType,
  type CustomReportEntity,
  type DataEntity,
} from 'loot-core/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useFilters } from '../../../hooks/useFilters';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePayees } from '../../../hooks/usePayees';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { AppliedFilters } from '../../filters/AppliedFilters';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { ChooseGraph } from '../ChooseGraph';
import {
  defaultsGraphList,
  defaultsList,
  disabledGraphList,
  disabledLegendLabel,
  disabledList,
} from '../disabledList';
import { getLiveRange } from '../getLiveRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportLegend } from '../ReportLegend';
import {
  ReportOptions,
  defaultReport,
  type dateRangeProps,
} from '../ReportOptions';
import { ReportSidebar } from '../ReportSidebar';
import { ReportSummary } from '../ReportSummary';
import { ReportTopbar } from '../ReportTopbar';
import { setSessionReport } from '../setSessionReport';
import { createCustomSpreadsheet } from '../spreadsheets/custom-spreadsheet';
import { createGroupedSpreadsheet } from '../spreadsheets/grouped-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

/**
 * Transform `selectedCategories` into `conditions`.
 */
function useSelectedCategories(
  conditions: RuleConditionEntity[],
  categories: CategoryEntity[],
): CategoryEntity[] {
  const existingCategoryCondition = useMemo(
    () => conditions.find(({ field }) => field === 'category'),
    [conditions],
  );

  return useMemo(() => {
    if (!existingCategoryCondition) {
      return categories;
    }

    switch (existingCategoryCondition.op) {
      case 'is':
        return categories.filter(
          ({ id }) => id === existingCategoryCondition.value,
        );

      case 'isNot':
        return categories.filter(
          ({ id }) => existingCategoryCondition.value !== id,
        );

      case 'oneOf':
        return categories.filter(({ id }) =>
          existingCategoryCondition.value.includes(id),
        );

      case 'notOneOf':
        return categories.filter(
          ({ id }) => !existingCategoryCondition.value.includes(id),
        );
    }

    return categories;
  }, [existingCategoryCondition, categories]);
}

export function CustomReport() {
  const categories = useCategories();
  const { isNarrowWidth } = useResponsive();
  const [_firstDayOfWeekIdx] = useLocalPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const [viewLegend = false, setViewLegendPref] =
    useLocalPref('reportsViewLegend');
  const [viewSummary = false, setViewSummaryPref] =
    useLocalPref('reportsViewSummary');
  const [viewLabels = false, setViewLabelsPref] =
    useLocalPref('reportsViewLabel');

  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters();

  const location = useLocation();

  const prevUrl = sessionStorage.getItem('url') || '';

  sessionStorage.setItem('prevUrl', prevUrl);
  sessionStorage.setItem('url', location.pathname);

  if (['/reports'].includes(prevUrl)) sessionStorage.clear();

  const reportFromSessionStorage = sessionStorage.getItem('report');
  const session = reportFromSessionStorage
    ? JSON.parse(reportFromSessionStorage)
    : {};
  const combine = location.state
    ? location.state.report ?? defaultReport
    : defaultReport;
  const loadReport = { ...combine, ...session };

  const [allIntervals, setAllIntervals] = useState<
    Array<{
      name: string;
      pretty: string;
    }>
  >([]);

  // Complex category conditions are:
  // - conditions with multiple "category" fields
  // - conditions with "category" field that use "contains", "doesNotContain" or "matches" operations
  const isComplexCategoryCondition =
    !!conditions.find(
      ({ field, op }) =>
        field === 'category' &&
        ['contains', 'doesNotContain', 'matches'].includes(op),
    ) || conditions.filter(({ field }) => field === 'category').length >= 2;

  const setSelectedCategories = (newCategories: CategoryEntity[]) => {
    const newCategoryIdSet = new Set(newCategories.map(({ id }) => id));
    const allCategoryIds = categories.list.map(({ id }) => id);
    const allCategoriesSelected = !allCategoryIds.find(
      id => !newCategoryIdSet.has(id),
    );
    const newCondition = {
      field: 'category',
      op: 'oneOf',
      value: newCategories.map(({ id }) => id),
      type: 'id',
    } satisfies RuleConditionEntity;

    const existingCategoryCondition = conditions.find(
      ({ field }) => field === 'category',
    );

    // If the existing conditions already have one for "category" - replace it
    if (existingCategoryCondition) {
      // If we selected all categories - remove the filter (default state)
      if (allCategoriesSelected) {
        onDeleteFilter(existingCategoryCondition);
        return;
      }

      // Update the "notOneOf" condition if it's already set
      if (existingCategoryCondition.op === 'notOneOf') {
        onUpdateFilter(existingCategoryCondition, {
          ...existingCategoryCondition,
          value: allCategoryIds.filter(id => !newCategoryIdSet.has(id)),
        });
        return;
      }

      // Otherwise use `oneOf` condition
      onUpdateFilter(existingCategoryCondition, newCondition);
      return;
    }

    // Don't add a new filter if all categories are selected (default state)
    if (allCategoriesSelected) {
      return;
    }

    // If the existing conditions does not have a "category" - append a new one
    onApplyFilter(newCondition);
  };

  const selectedCategories = useSelectedCategories(conditions, categories.list);
  const [startDate, setStartDate] = useState(loadReport.startDate);
  const [endDate, setEndDate] = useState(loadReport.endDate);
  const [mode, setMode] = useState(loadReport.mode);
  const [isDateStatic, setIsDateStatic] = useState(loadReport.isDateStatic);
  const [groupBy, setGroupBy] = useState(loadReport.groupBy);
  const [interval, setInterval] = useState(loadReport.interval);
  const [balanceType, setBalanceType] = useState(loadReport.balanceType);
  const [showEmpty, setShowEmpty] = useState(loadReport.showEmpty);
  const [showOffBudget, setShowOffBudget] = useState(loadReport.showOffBudget);
  const [includeCurrentInterval, setIncludeCurrentInterval] = useState(
    loadReport.includeCurrentInterval,
  );
  const [showHiddenCategories, setShowHiddenCategories] = useState(
    loadReport.showHiddenCategories,
  );
  const [showUncategorized, setShowUncategorized] = useState(
    loadReport.showUncategorized,
  );
  const [graphType, setGraphType] = useState(loadReport.graphType);

  const [dateRange, setDateRange] = useState(loadReport.dateRange);
  const [dataCheck, setDataCheck] = useState(false);
  const dateRangeLine =
    interval === 'Daily'
      ? 0
      : ReportOptions.dateRange.filter(f => f[interval as keyof dateRangeProps])
          .length - 3;

  const [intervals, setIntervals] = useState(
    monthUtils.rangeInclusive(startDate, endDate),
  );
  const [earliestTransaction, setEarliestTransaction] = useState('');
  const [report, setReport] = useState(loadReport);
  const [savedStatus, setSavedStatus] = useState(
    location.state
      ? location.state.report
        ? 'saved'
        : loadReport.savedStatus ?? 'new'
      : loadReport.savedStatus ?? 'new',
  );

  useEffect(() => {
    async function run() {
      onApplyFilter(null);
      report.conditions.forEach((condition: RuleConditionEntity) =>
        onApplyFilter(condition),
      );
      const trans = await send('get-earliest-transaction');
      setEarliestTransaction(trans ? trans.date : monthUtils.currentDay());
      const fromDate =
        interval === 'Weekly'
          ? 'dayFromDate'
          : (((ReportOptions.intervalMap.get(interval) || 'Day').toLowerCase() +
              'FromDate') as 'dayFromDate' | 'monthFromDate' | 'yearFromDate');

      const currentDate =
        interval === 'Weekly'
          ? 'currentDay'
          : (('current' +
              (ReportOptions.intervalMap.get(interval) || 'Day')) as
              | 'currentDay'
              | 'currentMonth'
              | 'currentYear');

      const currentInterval =
        interval === 'Weekly'
          ? monthUtils.currentWeek(firstDayOfWeekIdx)
          : monthUtils[currentDate]();
      const earliestInterval =
        interval === 'Weekly'
          ? monthUtils.weekFromDate(
              d.parseISO(fromDateRepr(trans.date || monthUtils.currentDay())),
              firstDayOfWeekIdx,
            )
          : monthUtils[fromDate](
              d.parseISO(fromDateRepr(trans.date || monthUtils.currentDay())),
            );

      const allIntervals =
        interval === 'Weekly'
          ? monthUtils.weekRangeInclusive(
              earliestInterval,
              currentInterval,
              firstDayOfWeekIdx,
            )
          : monthUtils[
              ReportOptions.intervalRange.get(interval) || 'rangeInclusive'
            ](earliestInterval, currentInterval);

      const allIntervalsMap = allIntervals
        .map((inter: string) => ({
          name: inter,
          pretty: monthUtils.format(
            inter,
            ReportOptions.intervalFormat.get(interval) || '',
          ),
        }))
        .reverse();

      setAllIntervals(allIntervalsMap);

      if (!isDateStatic) {
        const [dateStart, dateEnd] = getLiveRange(
          dateRange,
          trans ? trans.date : monthUtils.currentDay(),
          includeCurrentInterval,
          firstDayOfWeekIdx,
        );
        setStartDate(dateStart);
        setEndDate(dateEnd);
      }
    }
    run();
  }, [
    interval,
    dateRange,
    firstDayOfWeekIdx,
    isDateStatic,
    onApplyFilter,
    report.conditions,
    includeCurrentInterval,
  ]);

  useEffect(() => {
    const [start, end] = [startDate, endDate];
    if (interval === 'Weekly') {
      setIntervals(
        monthUtils.weekRangeInclusive(start, end, firstDayOfWeekIdx),
      );
    } else {
      setIntervals(
        monthUtils[
          ReportOptions.intervalRange.get(interval) || 'rangeInclusive'
        ](start, end),
      );
    }
  }, [interval, startDate, endDate, firstDayOfWeekIdx]);

  const balanceTypeOp: balanceTypeOpType =
    ReportOptions.balanceTypeMap.get(balanceType) || 'totalDebts';
  const payees = usePayees();
  const accounts = useAccounts();

  const getGroupData = useMemo(() => {
    return createGroupedSpreadsheet({
      startDate,
      endDate,
      interval,
      categories,
      conditions,
      conditionsOp,
      showEmpty,
      showOffBudget,
      showHiddenCategories,
      showUncategorized,
      balanceTypeOp,
      firstDayOfWeekIdx,
    });
  }, [
    startDate,
    endDate,
    interval,
    balanceTypeOp,
    categories,
    conditions,
    conditionsOp,
    showEmpty,
    showOffBudget,
    showHiddenCategories,
    showUncategorized,
    firstDayOfWeekIdx,
  ]);

  const getGraphData = useMemo(() => {
    setDataCheck(false);
    return createCustomSpreadsheet({
      startDate,
      endDate,
      interval,
      categories,
      conditions,
      conditionsOp,
      showEmpty,
      showOffBudget,
      showHiddenCategories,
      showUncategorized,
      groupBy,
      balanceTypeOp,
      payees,
      accounts,
      graphType,
      firstDayOfWeekIdx,
      setDataCheck,
    });
  }, [
    startDate,
    endDate,
    interval,
    groupBy,
    balanceTypeOp,
    categories,
    payees,
    accounts,
    conditions,
    conditionsOp,
    showEmpty,
    showOffBudget,
    showHiddenCategories,
    showUncategorized,
    graphType,
    firstDayOfWeekIdx,
  ]);
  const graphData = useReport('default', getGraphData);
  const groupedData = useReport('grouped', getGroupData);

  const data: DataEntity = { ...graphData, groupedData } as DataEntity;

  const customReportItems: CustomReportEntity = {
    id: '',
    name: '',
    startDate,
    endDate,
    isDateStatic,
    dateRange,
    mode,
    groupBy,
    interval,
    balanceType,
    showEmpty,
    showOffBudget,
    showHiddenCategories,
    includeCurrentInterval,
    showUncategorized,
    graphType,
    conditions,
    conditionsOp,
  };

  const navigate = useNavigate();
  const [, setScrollWidth] = useState(0);

  if (!allIntervals || !data) {
    return null;
  }

  const defaultModeItems = (graph: string, item: string) => {
    const chooseGraph = graph || graphType;
    const newGraph = (disabledList.modeGraphsMap.get(item) || []).includes(
      chooseGraph,
    )
      ? defaultsList.modeGraphsMap.get(item)
      : chooseGraph;
    if ((disabledList.modeGraphsMap.get(item) || []).includes(graphType)) {
      setSessionReport('graphType', newGraph);
      setGraphType(newGraph);
    }

    if (
      (disabledGraphList(item, newGraph, 'disabledSplit') || []).includes(
        groupBy,
      )
    ) {
      const cond = defaultsGraphList(item, newGraph, 'defaultSplit');
      setSessionReport('groupBy', cond);
      setGroupBy(cond);
    }

    if (
      (disabledGraphList(item, newGraph, 'disabledType') || []).includes(
        balanceType,
      )
    ) {
      const cond = defaultsGraphList(item, newGraph, 'defaultType');
      setSessionReport('balanceType', cond);
      setBalanceType(cond);
    }
  };

  const defaultItems = (item: string) => {
    const chooseGraph = ReportOptions.groupBy.includes(item) ? graphType : item;
    if (
      (disabledGraphList(mode, chooseGraph, 'disabledSplit') || []).includes(
        groupBy,
      )
    ) {
      const cond = defaultsGraphList(mode, chooseGraph, 'defaultSplit');
      setSessionReport('groupBy', cond);
      setGroupBy(cond);
    }
    if (
      (disabledGraphList(mode, chooseGraph, 'disabledType') || []).includes(
        balanceType,
      )
    ) {
      const cond = defaultsGraphList(mode, chooseGraph, 'defaultType');
      setSessionReport('balanceType', cond);
      setBalanceType(cond);
    }
  };

  const isItemDisabled = (type: string) => {
    switch (type) {
      case 'ShowLegend': {
        if (disabledLegendLabel(mode, graphType, 'disableLegend')) {
          setViewLegendPref(false);
        }
        return disabledLegendLabel(mode, graphType, 'disableLegend') || false;
      }
      case 'ShowLabels': {
        if (disabledLegendLabel(mode, graphType, 'disableLabel')) {
          setViewLabelsPref(false);
        }
        return disabledLegendLabel(mode, graphType, 'disableLabel') || false;
      }
      default:
        return (
          (disabledList.modeGraphsMap.get(mode) || []).includes(type) || false
        );
    }
  };

  const disabledItems = (type: string) => {
    switch (type) {
      case 'split':
        return disabledGraphList(mode, graphType, 'disabledSplit') || [];
      case 'type':
        return graphType === 'BarGraph' && groupBy === 'Interval'
          ? []
          : disabledGraphList(mode, graphType, 'disabledType') || [];
      default:
        return [];
    }
  };

  const onChangeDates = (dateStart: string, dateEnd: string) => {
    setSessionReport('startDate', dateStart);
    setSessionReport('endDate', dateEnd);
    setStartDate(dateStart);
    setEndDate(dateEnd);
    onReportChange({ type: 'modify' });
  };

  const onChangeViews = (viewType: string) => {
    if (viewType === 'viewLegend') {
      setViewLegendPref(!viewLegend);
    }
    if (viewType === 'viewSummary') {
      setViewSummaryPref(!viewSummary);
    }
    if (viewType === 'viewLabels') {
      setViewLabelsPref(!viewLabels);
    }
  };

  const setReportData = (input: CustomReportEntity) => {
    setStartDate(input.startDate);
    setEndDate(input.endDate);
    setIsDateStatic(input.isDateStatic);
    setDateRange(input.dateRange);
    setMode(input.mode);
    setGroupBy(input.groupBy);
    setInterval(input.interval);
    setBalanceType(input.balanceType);
    setShowEmpty(input.showEmpty);
    setShowOffBudget(input.showOffBudget);
    setShowHiddenCategories(input.showHiddenCategories);
    setIncludeCurrentInterval(input.includeCurrentInterval);
    setShowUncategorized(input.showUncategorized);
    setGraphType(input.graphType);
    onApplyFilter(null);
    (input.conditions || []).forEach(condition => onApplyFilter(condition));
    onConditionsOpChange(input.conditionsOp);
  };

  const onReportChange = ({
    savedReport,
    type,
  }: {
    savedReport?: CustomReportEntity;
    type: string;
  }) => {
    switch (type) {
      case 'add-update':
        setSessionReport('savedStatus', 'saved');
        setSavedStatus('saved');
        setReport(savedReport);
        break;
      case 'rename':
        setReport({ ...report, name: savedReport?.name || '' });
        break;
      case 'modify':
        if (report.name) {
          setSessionReport('savedStatus', 'modified');
          setSavedStatus('modified');
        }
        break;
      case 'reload':
        setSessionReport('savedStatus', 'saved');
        setSavedStatus('saved');
        setReportData(report);
        break;
      case 'reset':
        sessionStorage.clear();
        setSavedStatus('new');
        setReport(defaultReport);
        setReportData(defaultReport);
        break;
      case 'choose':
        setSessionReport('savedStatus', 'saved');
        setSavedStatus('saved');
        setReport(savedReport);
        setReportData(savedReport || report);
        break;
      default:
    }
  };

  const onBackClick = () => {
    navigate('/reports');
  };

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={`Custom Report: ${report.name || 'Unsaved report'}`}
            leftContent={<MobileBackButton onClick={onBackClick} />}
          />
        ) : (
          <PageHeader
            title={
              <>
                <Text>Custom Report:</Text>
                <Text style={{ marginLeft: 5, color: theme.pageTextPositive }}>
                  {report.name || 'Unsaved report'}
                </Text>
              </>
            }
          />
        )
      }
      padding={0}
    >
      <View
        style={{
          flexDirection: 'row',
          paddingLeft: !isNarrowWidth ? 20 : undefined,
          flex: 1,
        }}
      >
        {!isNarrowWidth && (
          <ReportSidebar
            customReportItems={customReportItems}
            selectedCategories={selectedCategories}
            categories={categories}
            dateRangeLine={dateRangeLine}
            allIntervals={allIntervals}
            setDateRange={setDateRange}
            setGraphType={setGraphType}
            setGroupBy={setGroupBy}
            setInterval={setInterval}
            setBalanceType={setBalanceType}
            setMode={setMode}
            setIsDateStatic={setIsDateStatic}
            setShowEmpty={setShowEmpty}
            setShowOffBudget={setShowOffBudget}
            setShowHiddenCategories={setShowHiddenCategories}
            setIncludeCurrentInterval={setIncludeCurrentInterval}
            setShowUncategorized={setShowUncategorized}
            setSelectedCategories={setSelectedCategories}
            onChangeDates={onChangeDates}
            onReportChange={onReportChange}
            disabledItems={disabledItems}
            defaultItems={defaultItems}
            defaultModeItems={defaultModeItems}
            earliestTransaction={earliestTransaction}
            firstDayOfWeekIdx={firstDayOfWeekIdx}
            isComplexCategoryCondition={isComplexCategoryCondition}
          />
        )}
        <View
          style={{
            flex: 1,
          }}
        >
          {!isNarrowWidth && (
            <ReportTopbar
              customReportItems={customReportItems}
              report={report}
              savedStatus={savedStatus}
              setGraphType={setGraphType}
              viewLegend={viewLegend}
              viewSummary={viewSummary}
              viewLabels={viewLabels}
              onApplyFilter={onApplyFilter}
              onChangeViews={onChangeViews}
              onReportChange={onReportChange}
              isItemDisabled={isItemDisabled}
              defaultItems={defaultItems}
            />
          )}
          {conditions && conditions.length > 0 && (
            <View
              style={{
                marginBottom: 10,
                marginLeft: 5,
                flexShrink: 0,
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}
            >
              <AppliedFilters
                conditions={conditions}
                onUpdate={(oldFilter, newFilter) => {
                  setSessionReport(
                    'conditions',
                    conditions.map(f => (f === oldFilter ? newFilter : f)),
                  );
                  onReportChange({ type: 'modify' });
                  onUpdateFilter(oldFilter, newFilter);
                }}
                onDelete={deletedFilter => {
                  setSessionReport(
                    'conditions',
                    conditions.filter(f => f !== deletedFilter),
                  );
                  onDeleteFilter(deletedFilter);
                  onReportChange({ type: 'modify' });
                }}
                conditionsOp={conditionsOp}
                onConditionsOpChange={co => {
                  onConditionsOpChange(co);
                  onReportChange({ type: 'modify' });
                }}
              />
            </View>
          )}
          <View
            style={{
              backgroundColor: theme.tableBackground,
              flexDirection: 'row',
              flex: '1 0 auto',
            }}
          >
            <View
              style={{
                flex: 1,
                padding: 10,
              }}
            >
              {graphType !== 'TableGraph' && (
                <View
                  style={{
                    alignItems: 'flex-end',
                    paddingTop: 10,
                  }}
                >
                  <View
                    style={{
                      ...styles.mediumText,
                      fontWeight: 500,
                      marginBottom: 5,
                    }}
                  >
                    <AlignedText
                      left={<Block>{balanceType}:</Block>}
                      right={
                        <Text>
                          <PrivacyFilter blurIntensity={5}>
                            {amountToCurrency(data[balanceTypeOp])}
                          </PrivacyFilter>
                        </Text>
                      }
                    />
                  </View>
                </View>
              )}
              <View style={{ flex: 1, overflow: 'auto' }}>
                {dataCheck ? (
                  <ChooseGraph
                    data={data}
                    filters={conditions}
                    mode={mode}
                    graphType={graphType}
                    balanceType={balanceType}
                    groupBy={groupBy}
                    interval={interval}
                    setScrollWidth={setScrollWidth}
                    viewLabels={viewLabels}
                    compact={false}
                    showHiddenCategories={showHiddenCategories}
                    showOffBudget={showOffBudget}
                    intervalsCount={intervals.length}
                  />
                ) : (
                  <LoadingIndicator message="Loading report..." />
                )}
              </View>
            </View>
            {(viewLegend || viewSummary) && data && !isNarrowWidth && (
              <View
                style={{
                  padding: 10,
                  minWidth: 300,
                  textAlign: 'center',
                }}
              >
                {viewSummary && (
                  <ReportSummary
                    startDate={startDate}
                    endDate={endDate}
                    balanceTypeOp={balanceTypeOp}
                    data={data}
                    interval={interval}
                    intervalsCount={intervals.length}
                  />
                )}
                {viewLegend && (
                  <ReportLegend
                    legend={data.legend}
                    groupBy={groupBy}
                    interval={interval}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}
