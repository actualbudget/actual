import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';
import { type CategoryEntity } from 'loot-core/types/models/category';
import {
  type CustomReportEntity,
  type DataEntity,
} from 'loot-core/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useFilters } from '../../../hooks/useFilters';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { usePayees } from '../../../hooks/usePayees';
import { SvgArrowLeft } from '../../../icons/v1/ArrowLeft';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Link } from '../../common/Link';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { AppliedFilters } from '../../filters/AppliedFilters';
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
    filters,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onCondOpChange,
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

  const [selectedCategories, setSelectedCategories] = useState(
    loadReport.selectedCategories,
  );
  const [startDate, setStartDate] = useState(loadReport.startDate);
  const [endDate, setEndDate] = useState(loadReport.endDate);
  const [mode, setMode] = useState(loadReport.mode);
  const [isDateStatic, setIsDateStatic] = useState(loadReport.isDateStatic);
  const [groupBy, setGroupBy] = useState(loadReport.groupBy);
  const [interval, setInterval] = useState(loadReport.interval);
  const [balanceType, setBalanceType] = useState(loadReport.balanceType);
  const [showEmpty, setShowEmpty] = useState(loadReport.showEmpty);
  const [showOffBudget, setShowOffBudget] = useState(loadReport.showOffBudget);
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
    ReportOptions.dateRange.filter(f => f[interval as keyof dateRangeProps])
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
    if (selectedCategories === undefined && categories.list.length !== 0) {
      setSelectedCategories(categories.list);
    }
  }, [categories, selectedCategories]);

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

  const balanceTypeOp: 'totalAssets' | 'totalDebts' | 'totalTotals' =
    ReportOptions.balanceTypeMap.get(balanceType) || 'totalDebts';
  const payees = usePayees();
  const accounts = useAccounts();

  const getGroupData = useMemo(() => {
    return createGroupedSpreadsheet({
      startDate,
      endDate,
      interval,
      categories,
      selectedCategories,
      conditions: filters,
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
    selectedCategories,
    filters,
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
      selectedCategories,
      conditions: filters,
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
    selectedCategories,
    payees,
    accounts,
    filters,
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
    showUncategorized,
    selectedCategories,
    graphType,
    conditions: filters,
    conditionsOp,
  };

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
    const selectAll: CategoryEntity[] = [];
    categories.grouped.map(categoryGroup =>
      (categoryGroup.categories || []).map(category =>
        selectAll.push(category),
      ),
    );

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
    setShowUncategorized(input.showUncategorized);
    setSelectedCategories(input.selectedCategories || selectAll);
    setGraphType(input.graphType);
    onApplyFilter(null);
    (input.conditions || []).forEach(condition => onApplyFilter(condition));
    onCondOpChange(input.conditionsOp);
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

  return (
    <View
      style={{
        ...styles.page,
        minWidth: isNarrowWidth ? undefined : 650,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: isNarrowWidth ? 'column' : 'row',
          flexShrink: 0,
        }}
      >
        <View
          style={{
            padding: 10,
            paddingTop: 0,
            flexShrink: 0,
          }}
        >
          <Link
            variant="button"
            type="bare"
            to="/reports"
            style={{ marginBottom: '15', alignSelf: 'flex-start' }}
          >
            <SvgArrowLeft width={10} height={10} style={{ marginRight: 5 }} />{' '}
            Back
          </Link>
          <View style={styles.veryLargeText}>Custom Report:</View>
        </View>
        <Text
          style={{
            ...styles.veryLargeText,
            marginTop: isNarrowWidth ? 0 : 40,
            padding: isNarrowWidth ? 10 : 0,
            paddingTop: 0,
            flexShrink: 0,
            color: theme.pageTextPositive,
          }}
        >
          {report.name || 'Unsaved report'}
        </Text>
      </View>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          padding: 15,
          paddingTop: 0,
          flexGrow: 1,
        }}
      >
        {!isNarrowWidth && (
          <ReportSidebar
            customReportItems={customReportItems}
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
            setShowUncategorized={setShowUncategorized}
            setSelectedCategories={setSelectedCategories}
            onChangeDates={onChangeDates}
            onReportChange={onReportChange}
            disabledItems={disabledItems}
            defaultItems={defaultItems}
            defaultModeItems={defaultModeItems}
            earliestTransaction={earliestTransaction}
            firstDayOfWeekIdx={firstDayOfWeekIdx}
          />
        )}
        <View
          style={{
            flexGrow: 1,
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
          {filters && filters.length > 0 && (
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
                filters={filters}
                onUpdate={(oldFilter, newFilter) => {
                  setSessionReport(
                    'conditions',
                    filters.map(f => (f === oldFilter ? newFilter : f)),
                  );
                  onReportChange({ type: 'modify' });
                  onUpdateFilter(oldFilter, newFilter);
                }}
                onDelete={deletedFilter => {
                  setSessionReport(
                    'conditions',
                    filters.filter(f => f !== deletedFilter),
                  );
                  onDeleteFilter(deletedFilter);
                  onReportChange({ type: 'modify' });
                }}
                conditionsOp={conditionsOp}
                onCondOpChange={co => {
                  onCondOpChange(co);
                  onReportChange({ type: 'modify' });
                }}
              />
            </View>
          )}
          <View
            style={{
              backgroundColor: theme.tableBackground,
              flexGrow: 1,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                flexGrow: 1,
              }}
            >
              <View
                style={{
                  flexDirection: 'column',
                  flexGrow: 1,
                  padding: 10,
                  paddingTop: 10,
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
                              {amountToCurrency(Math.abs(data[balanceTypeOp]))}
                            </PrivacyFilter>
                          </Text>
                        }
                      />
                    </View>
                  </View>
                )}

                {dataCheck ? (
                  <ChooseGraph
                    data={data}
                    filters={filters}
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
              {(viewLegend || viewSummary) && data && !isNarrowWidth && (
                <View
                  style={{
                    padding: 10,
                    flexDirection: 'column',
                    minWidth: 300,
                    marginRight: 10,
                    textAlign: 'center',
                    flexShrink: 0,
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
      </View>
    </View>
  );
}
