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
  const loadReport = location.state
    ? location.state.report ?? defaultReport
    : defaultReport;

  const [allMonths, setAllMonths] = useState(null);
  const [typeDisabled, setTypeDisabled] = useState(['Net']);

  const [selectedCategories, setSelectedCategories] = useState(
    loadReport.selectedCategories,
  );
  const [startDate, setStartDate] = useState(loadReport.startDate);
  const [endDate, setEndDate] = useState(loadReport.endDate);
  const [mode, setMode] = useState(loadReport.mode);
  const [isDateStatic, setIsDateStatic] = useState(loadReport.isDateStatic);
  const [groupBy, setGroupBy] = useState(loadReport.groupBy);
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

  const [report, setReport] = useState(loadReport);
  const [savedStatus, setSavedStatus] = useState(
    location.state ? (location.state.report ? 'saved' : 'new') : 'new',
  );
  const months = monthUtils.rangeInclusive(startDate, endDate);

  useEffect(() => {
    if (selectedCategories === undefined && categories.list.length !== 0) {
      setSelectedCategories(categories.list);
    }
  }, [categories, selectedCategories]);

  useEffect(() => {
    async function run() {
      report.conditions.forEach(condition => onApplyFilter(condition));
      const trans = await send('get-earliest-transaction');
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

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, monthUtils.currentMonth())
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy'),
        }))
        .reverse();

      setAllMonths(allMonths);
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

  if (!allMonths || !data) {
    return null;
  }

  const onChangeDates = (startDate, endDate) => {
    setStartDate(startDate);
    setEndDate(endDate);
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

  const onResetReports = () => {
    const selectAll = [];
    categories.grouped.map(categoryGroup =>
      categoryGroup.categories.map(category => selectAll.push(category)),
    );

    setStartDate(defaultReport.startDate);
    setEndDate(defaultReport.endDate);
    setIsDateStatic(defaultReport.isDateStatic);
    setDateRange(defaultReport.dateRange);
    setMode(defaultReport.mode);
    setGroupBy(defaultReport.groupBy);
    setBalanceType(defaultReport.balanceType);
    setShowEmpty(defaultReport.showEmpty);
    setShowOffBudget(defaultReport.showOffBudget);
    setShowHiddenCategories(defaultReport.showHiddenCategories);
    setShowUncategorized(defaultReport.showUncategorized);
    setSelectedCategories(selectAll);
    setGraphType(defaultReport.graphType);
    onApplyFilter(null);
    onCondOpChange(defaultReport.conditionsOp);
    setReport(defaultReport);
    setSavedStatus('new');
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
        setSavedStatus('saved');

        setStartDate(report.startDate);
        setEndDate(report.endDate);
        setIsDateStatic(report.isDateStatic);
        setDateRange(report.dateRange);
        setMode(report.mode);
        setGroupBy(report.groupBy);
        setBalanceType(report.balanceType);
        setShowEmpty(report.showEmpty);
        setShowOffBudget(report.showOffBudget);
        setShowHiddenCategories(report.showHiddenCategories);
        setShowUncategorized(report.showUncategorized);
        setSelectedCategories(report.selectedCategories);
        setGraphType(report.graphType);
        onApplyFilter(null);
        report.conditions.forEach(condition => onApplyFilter(condition));
        onCondOpChange(report.conditionsOp);
        break;
      default:
    }
  };

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <Header title="Custom Reports:" />
        <Text
          style={{
            ...styles.veryLargeText,
            marginTop: 40,
            color: theme.pageTextPositive,
          }}
        >
          {report.name ?? 'Unsaved report'}
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
          allMonths={allMonths}
          setDateRange={setDateRange}
          typeDisabled={typeDisabled}
          setTypeDisabled={setTypeDisabled}
          setGraphType={setGraphType}
          setGroupBy={setGroupBy}
          setBalanceType={setBalanceType}
          setMode={setMode}
          setIsDateStatic={setIsDateStatic}
          setShowEmpty={setShowEmpty}
          setShowOffBudget={setShowOffBudget}
          setShowHiddenCategories={setShowHiddenCategories}
          setShowUncategorized={setShowUncategorized}
          setSelectedCategories={setSelectedCategories}
          onChangeDates={onChangeDates}
          onChangeViews={onChangeViews}
          onReportChange={onReportChange}
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
            setTypeDisabled={setTypeDisabled}
            setBalanceType={setBalanceType}
            setGroupBy={setGroupBy}
            viewLegend={viewLegend}
            viewSummary={viewSummary}
            viewLabels={viewLabels}
            onApplyFilter={onApplyFilter}
            onChangeViews={onChangeViews}
            onReportChange={onReportChange}
            onResetReports={onResetReports}
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
                      monthsCount={months.length}
                    />
                  )}
                  {viewLegend && (
                    <ReportLegend legend={data.legend} groupBy={groupBy} />
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
