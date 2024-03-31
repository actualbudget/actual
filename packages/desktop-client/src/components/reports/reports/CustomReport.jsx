import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useFilters } from '../../../hooks/useFilters';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { usePayees } from '../../../hooks/usePayees';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { AppliedFilters } from '../../filters/AppliedFilters';
import { PrivacyFilter } from '../../PrivacyFilter';
import { ChooseGraph } from '../ChooseGraph';
import { defaultsList, disabledList } from '../disabledList';
import { Header } from '../Header';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportLegend } from '../ReportLegend';
import { ReportOptions, defaultReport } from '../ReportOptions';
import { ReportSidebar } from '../ReportSidebar';
import { ReportSummary } from '../ReportSummary';
import { ReportTopbar } from '../ReportTopbar';
import { createCustomSpreadsheet } from '../spreadsheets/custom-spreadsheet';
import { createGroupedSpreadsheet } from '../spreadsheets/grouped-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

export function CustomReport() {
  const categories = useCategories();

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

  const prevUrl = localStorage.getItem('url');

  sessionStorage.setItem('prevUrl', prevUrl);
  sessionStorage.setItem('url', location.pathname);

  if (['/reports'].includes(prevUrl)) sessionStorage.clear();

  const session = JSON.parse(sessionStorage.getItem('report'));
  const combine = location.state
    ? location.state.report ?? defaultReport
    : defaultReport;
  const loadReport = { ...combine, ...session };

  const [allIntervals, setAllIntervals] = useState(null);

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
  const dateRangeLine = ReportOptions.dateRange.length - 3;

  const [earliestTransaction, setEarliestTransaction] = useState('');
  const [report, setReport] = useState(loadReport);
  const [savedStatus, setSavedStatus] = useState(
    location.state ? (location.state.report ? 'saved' : 'new') : 'new',
  );
  const intervals = monthUtils.rangeInclusive(startDate, endDate);

  useEffect(() => {
    if (selectedCategories === undefined && categories.list.length !== 0) {
      setSelectedCategories(categories.list);
    }
  }, [categories, selectedCategories]);

  useEffect(() => {
    async function run() {
      report.conditions.forEach(condition => onApplyFilter(condition));
      const trans = await send('get-earliest-transaction');
      setEarliestTransaction(trans ? trans.date : monthUtils.currentDay());
      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : currentMonth;

      // Make sure the month selects are at least populates with a
      // year's worth of months. We can undo this when we have fancier
      // date selects.
      const yearAgo = monthUtils.subMonths(monthUtils.currentMonth(), 12);
      if (earliestMonth > yearAgo) {
        earliestMonth = yearAgo;
      }

      const allInter = monthUtils
        .rangeInclusive(earliestMonth, monthUtils.currentMonth())
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy'),
        }))
        .reverse();

      setAllIntervals(allInter);
    }
    run();
  }, []);

  const balanceTypeOp = ReportOptions.balanceTypeMap.get(balanceType);
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
    });
  }, [
    startDate,
    endDate,
    groupBy,
    interval,
    balanceType,
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
      setDataCheck,
      graphType,
    });
  }, [
    startDate,
    endDate,
    groupBy,
    interval,
    balanceType,
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
  ]);
  const graphData = useReport('default', getGraphData);
  const groupedData = useReport('grouped', getGroupData);

  const data = { ...graphData, groupedData };
  const customReportItems = {
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
    data,
  };

  const [scrollWidth, setScrollWidth] = useState(0);

  if (!allIntervals || !data) {
    return null;
  }

  const defaultModeItems = (graph, item) => {
    const chooseGraph = graph || graphType;
    const newGraph = disabledList.modeGraphsMap.get(item).includes(chooseGraph)
      ? defaultsList.modeGraphsMap.get(item)
      : chooseGraph;
    if (disabledList.modeGraphsMap.get(item).includes(graphType)) {
      setGraphType(newGraph);
    }

    if (disabledList.graphSplitMap.get(item).get(newGraph).includes(groupBy)) {
      setGroupBy(defaultsList.graphSplitMap.get(item).get(newGraph));
    }

    if (
      disabledList.graphTypeMap.get(item).get(newGraph).includes(balanceType)
    ) {
      setBalanceType(defaultsList.graphTypeMap.get(item).get(newGraph));
    }
  };

  const defaultItems = item => {
    const chooseGraph = ReportOptions.groupBy.includes(item) ? graphType : item;
    if (
      disabledList.graphSplitMap.get(mode).get(chooseGraph).includes(groupBy)
    ) {
      setGroupBy(defaultsList.graphSplitMap.get(mode).get(chooseGraph));
    }
    if (
      disabledList.graphTypeMap.get(mode).get(chooseGraph).includes(balanceType)
    ) {
      setBalanceType(defaultsList.graphTypeMap.get(mode).get(chooseGraph));
    }
  };

  const disabledItems = type => {
    switch (type) {
      case 'split':
        return disabledList.graphSplitMap.get(mode).get(graphType);
      case 'type':
        return graphType === 'BarGraph' && groupBy === 'Interval'
          ? []
          : disabledList.graphTypeMap.get(mode).get(graphType);
      case 'ShowLegend': {
        if (disabledList.graphLegendMap.get(mode).get(graphType)) {
          setViewLegendPref(false);
        }
        return disabledList.graphLegendMap.get(mode).get(graphType);
      }
      case 'ShowLabels': {
        if (disabledList.graphLabelsMap.get(mode).get(graphType)) {
          setViewLabelsPref(false);
        }
        return disabledList.graphLabelsMap.get(mode).get(graphType);
      }
      default:
        return disabledList.modeGraphsMap.get(mode).includes(type);
    }
  };

  const onChangeDates = (dateStart, dateEnd) => {
    const storedReport = JSON.parse(sessionStorage.getItem('report'));
    sessionStorage.setItem(
      'report',
      JSON.stringify({
        ...storedReport,
        startDate: dateStart,
        endDate: dateEnd,
      }),
    );
    setStartDate(dateStart);
    setEndDate(dateEnd);
    onReportChange({ type: 'modify' });
  };

  const onChangeViews = (viewType, status) => {
    if (viewType === 'viewLegend') {
      setViewLegendPref(status ?? !viewLegend);
    }
    if (viewType === 'viewSummary') {
      setViewSummaryPref(!viewSummary);
    }
    if (viewType === 'viewLabels') {
      setViewLabelsPref(!viewLabels);
    }
  };

  const setReportData = input => {
    const selectAll = [];
    categories.grouped.map(categoryGroup =>
      categoryGroup.categories.map(category => selectAll.push(category)),
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
    setSelectedCategories(input.selectedCategories ?? selectAll);
    setGraphType(input.graphType);
    onApplyFilter(null);
    input.conditions.forEach(condition => onApplyFilter(condition));
    onCondOpChange(input.conditionsOp);
  };

  const onChangeAppliedFilter = (filter, changedElement) => {
    onReportChange({ type: 'modify' });
    return changedElement(filter);
  };

  const onReportChange = ({ savedReport, type }) => {
    switch (type) {
      case 'add-update':
        setSavedStatus('saved');
        setReport(savedReport);
        break;
      case 'rename':
        setReport({ ...report, name: savedReport.name });
        break;
      case 'modify':
        if (report.name) {
          setSavedStatus('modified');
        }
        break;
      case 'reload':
        sessionStorage.clear();
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
        sessionStorage.clear();
        setSavedStatus('saved');
        setReport(savedReport);
        setReportData(savedReport);
        break;
      default:
    }
  };

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
      <View
        style={{
          flexDirection: 'row',
          flexShrink: 0,
        }}
      >
        <Header title="Custom Report:" />
        <Text
          style={{
            ...styles.veryLargeText,
            marginTop: 40,
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
        />
        <View
          style={{
            flexGrow: 1,
          }}
        >
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
            disabledItems={disabledItems}
            defaultItems={defaultItems}
          />
          {filters && filters.length > 0 && (
            <View
              style={{ marginBottom: 10, marginLeft: 5, flexShrink: 0 }}
              spacing={2}
              direction="row"
              justify="flex-start"
              align="flex-start"
            >
              <AppliedFilters
                filters={filters}
                onUpdate={onUpdateFilter}
                onDelete={filter =>
                  onChangeAppliedFilter(filter, onDeleteFilter)
                }
                conditionsOp={conditionsOp}
                onCondOpChange={filter =>
                  onChangeAppliedFilter(filter, onCondOpChange)
                }
                onUpdateChange={onReportChange}
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
                    startDate={startDate}
                    endDate={endDate}
                    data={data}
                    mode={mode}
                    graphType={graphType}
                    balanceType={balanceType}
                    groupBy={groupBy}
                    interval={interval}
                    showEmpty={showEmpty}
                    scrollWidth={scrollWidth}
                    setScrollWidth={setScrollWidth}
                    viewLabels={viewLabels}
                    compact={false}
                  />
                ) : (
                  <LoadingIndicator message="Loading report..." />
                )}
              </View>
              {(viewLegend || viewSummary) && data && (
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
