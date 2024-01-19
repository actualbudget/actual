import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import * as d from 'date-fns';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';

import { useActions } from '../../../hooks/useActions';
import { useCategories } from '../../../hooks/useCategories';
import { useFilters } from '../../../hooks/useFilters';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { AppliedFilters } from '../../filters/FiltersMenu';
import { PrivacyFilter } from '../../PrivacyFilter';
import { ChooseGraph } from '../ChooseGraph';
import { Header } from '../Header';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportLegend } from '../ReportLegend';
import { ReportOptions, defaultState } from '../ReportOptions';
import { ReportSidebar } from '../ReportSidebar';
import { ReportSummary } from '../ReportSummary';
import { ReportTopbar } from '../ReportTopbar';
import { createCustomSpreadsheet } from '../spreadsheets/custom-spreadsheet';
import { createGroupedSpreadsheet } from '../spreadsheets/grouped-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';
import { useLocation } from 'react-router-dom';

export function CustomReport() {
  const categories = useCategories();

  const viewLegend =
    useSelector(state => state.prefs.local?.reportsViewLegend) || false;
  const viewSummary =
    useSelector(state => state.prefs.local?.reportsViewSummary) || false;
  const viewLabels =
    useSelector(state => state.prefs.local?.reportsViewLabel) || false;
  const { savePrefs } = useActions();

  const {
    filters,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onCondOpChange,
  } = useFilters();

  const location = useLocation();
  const loadReport = location.state.report ?? defaultState;

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
  const [showOffBudgetHidden, setShowOffBudgetHidden] = useState(loadReport.showOffBudgetHidden);
  const [showUncategorized, setShowUncategorized] = useState(loadReport.showUncategorized);
  const [graphType, setGraphType] = useState(loadReport.graphType);

  const [dateRange, setDateRange] = useState('Last 6 months');
  const [dataCheck, setDataCheck] = useState(false);
  const dateRangeLine = ReportOptions.dateRange.length - 3;

  const [report, setReport] = useState(location.state.report ?? []);
  const [savedStatus, setSavedStatus] = useState(location.state.report ? 'saved' : 'new');
  const months = monthUtils.rangeInclusive(startDate, endDate);

  useEffect(() => {
    if (selectedCategories === null && categories.list.length !== 0) {
      setSelectedCategories(categories.list);
    }
  }, [categories, selectedCategories]);

  useEffect(() => {
    async function run() {
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
  const payees = useCachedPayees();
  const accounts = useCachedAccounts();

  const getGroupData = useMemo(() => {
    return createGroupedSpreadsheet({
      startDate,
      endDate,
      categories,
      selectedCategories,
      conditions: filters,
      conditionsOp,
      showEmpty,
      showOffBudgetHidden,
      showUncategorized,
      balanceTypeOp,
    });
  }, [
    startDate,
    endDate,
    categories,
    selectedCategories,
    filters,
    conditionsOp,
    showEmpty,
    showOffBudgetHidden,
    showUncategorized,
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
      showOffBudgetHidden,
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
    showOffBudgetHidden,
    showUncategorized,
    graphType,
  ]);
  const graphData = useReport('default', getGraphData);
  const groupedData = useReport('grouped', getGroupData);

  const data = { ...graphData, groupedData };

  const items = {
    id: null,
    startDate: startDate,
    endDate: endDate,
    mode: mode,
    groupBy: groupBy,
    balanceType: balanceType,
    showEmpty: showEmpty,
    showOffBudgetHidden: showOffBudgetHidden,
    showUncategorized: showUncategorized,
    graphType: graphType,
    filters: filters,
    conditionsOp: conditionsOp,
    selectedCategories: selectedCategories,
    data: data,
  };

  const [scrollWidth, setScrollWidth] = useState(0);

  if (!allMonths || !data) {
    return null;
  }

  const onChangeDates = (startDate, endDate) => {
    setStartDate(startDate);
    setEndDate(endDate);
    setSavedStatus('changed');
  };

  const onChangeViews = (viewType, status) => {
    if (viewType === 'viewLegend') {
      savePrefs({ reportsViewLegend: status ?? !viewLegend });
    }
    if (viewType === 'viewSummary') {
      savePrefs({ reportsViewSummary: !viewSummary });
    }
    if (viewType === 'viewLabels') {
      savePrefs({ reportsViewLabel: !viewLabels });
    }
  };

  const onResetReports = () => {
    setMode(stateDefault.mode);
    setGroupBy(stateDefault.groupBy);
    setBalanceType(stateDefault.balanceType);
    setShowEmpty(stateDefault.empty);
    setShowOffBudgetHidden(stateDefault.hidden);
    setShowUncategorized(stateDefault.uncat);
    setGraphType(stateDefault.graphType);
    onApplyFilter(null);
    onCondOpChange(stateDefault.conditionsOp);
    setReport([]);
    setStartDate(stateDefault.start);
    setEndDate(stateDefault.end);
    setSavedStatus('new');
  };

  const onReportChange = (savedReport, type) => {
    if (type === 'add-update') { //status = saved
      setReport(savedReport);
    }
    
    if (type === 'reload') {
      setMode(report.mode);
      setGroupBy(report.groupBy);
      setBalanceType(report.balanceType);
      setShowEmpty(report.empty);
      setShowOffBudgetHidden(report.hidden);
      setShowUncategorized(report.uncat);
      setGraphType(report.graphType);
      onApplyFilter(report.filters);
      onCondOpChange(report.conditionsOp);
      setStartDate(report.start);
      setEndDate(report.end);
    } else {
      if (savedStatus === 'saved') {
      }
    }
  };

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
      <Header title="Custom Reports" />
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
          startDate={startDate}
          endDate={endDate}
          onChangeDates={onChangeDates}
          dateRange={dateRange}
          setDateRange={setDateRange}
          dateRangeLine={dateRangeLine}
          allMonths={allMonths}
          graphType={graphType}
          setGraphType={setGraphType}
          typeDisabled={typeDisabled}
          setTypeDisabled={setTypeDisabled}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          balanceType={balanceType}
          setBalanceType={setBalanceType}
          mode={mode}
          setMode={setMode}
          isDateStatic={isDateStatic}
          setIsDateStatic={setIsDateStatic}
          showEmpty={showEmpty}
          setShowEmpty={setShowEmpty}
          showOffBudgetHidden={showOffBudgetHidden}
          setShowOffBudgetHidden={setShowOffBudgetHidden}
          showUncategorized={showUncategorized}
          setShowUncategorized={setShowUncategorized}
          categories={categories}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          onChangeViews={onChangeViews}
          setSavedStatus={setSavedStatus}
        />
        <View
          style={{
            flexGrow: 1,
          }}
        >
          <ReportTopbar
            items={items}
            report={report}
            savedStatus={savedStatus}
            setSavedStatus={setSavedStatus}
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
                onDelete={onDeleteFilter}
                conditionsOp={conditionsOp}
                onCondOpChange={onCondOpChange}
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
                    mode={mode}
                    graphType={graphType}
                    balanceType={balanceType}
                    groupBy={groupBy}
                    showEmpty={showEmpty}
                    scrollWidth={scrollWidth}
                    setScrollWidth={setScrollWidth}
                    months={months}
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
