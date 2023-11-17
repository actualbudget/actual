import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';

import useCategories from '../../../hooks/useCategories';
import useFilters from '../../../hooks/useFilters';
import { theme, styles } from '../../../style';
import AlignedText from '../../common/AlignedText';
import Block from '../../common/Block';
import Text from '../../common/Text';
import View from '../../common/View';
import { AppliedFilters } from '../../filters/FiltersMenu';
import PrivacyFilter from '../../PrivacyFilter';
import { ChooseGraph } from '../ChooseGraph';
import Convert from '../Convert';
import Header from '../Header';
import { ReportOptions, defaultState } from '../ReportOptions';
import { ReportSidebar } from '../ReportSidebar';
import { ReportLegend, ReportSummary } from '../ReportSummary';
import { ReportTopbar } from '../ReportTopbar';
import defaultSpreadsheet from '../spreadsheets/default-spreadsheet';
import useReport from '../useReport';
import { fromDateRepr } from '../util';

export default function CustomReport() {
  const categories = useCategories();

  let { payees, accounts } = useSelector(state => {
    return {
      payees: state.queries.payees,
      accounts: state.queries.accounts,
    };
  });

  const {
    filters,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onCondOpChange,
  } = useFilters();

  const location = useLocation();
  const converted = location.state.report && {
    ...location.state.report,
    empty: Convert(location.state.report.empty),
    hidden: Convert(location.state.report.hidden),
    uncat: Convert(location.state.report.uncat),
    viewLabels: Convert(location.state.report.viewLabels),
    viewLegend: Convert(location.state.report.viewLegend),
    viewSummary: Convert(location.state.report.viewSummary),
  };
  const loadReport = location.state.report ? converted : defaultState();
  const stateDefault = defaultState();

  const [selectedCategories, setSelectedCategories] = useState(null);
  const [allMonths, setAllMonths] = useState(null);
  const [typeDisabled, setTypeDisabled] = useState(['Net']);
  const [start, setStart] = useState(loadReport.start);
  const [end, setEnd] = useState(loadReport.end);

  const [mode, setMode] = useState(loadReport.mode);
  const [reportId, setReportId] = useState(
    location.state.report ? location.state.report : [],
  );
  const [groupBy, setGroupBy] = useState(loadReport.groupBy);
  const [balanceType, setBalanceType] = useState(loadReport.balanceType);
  const [empty, setEmpty] = useState(loadReport.empty);
  const [hidden, setHidden] = useState(loadReport.hidden);
  const [uncat, setUncat] = useState(loadReport.uncat);
  const [dateRange, setDateRange] = useState('6 months');

  const [graphType, setGraphType] = useState(loadReport.graphType);
  const [viewLegend, setViewLegend] = useState(loadReport.viewLegend);
  const [viewSummary, setViewSummary] = useState(loadReport.viewSummary);
  const [viewLabels, setViewLabels] = useState(loadReport.viewLabels);
  //const [legend, setLegend] = useState([]);
  let legend = [];
  const dateRangeLine = ReportOptions.dateRange.length - 1;

  const months = monthUtils.rangeInclusive(start, end);
  const getGraphData = useMemo(() => {
    return defaultSpreadsheet(
      start,
      end,
      groupBy,
      ReportOptions.balanceTypeMap.get(balanceType),
      categories,
      selectedCategories,
      payees,
      accounts,
      filters,
      conditionsOp,
      hidden,
      uncat,
    );
  }, [
    start,
    end,
    groupBy,
    balanceType,
    categories,
    selectedCategories,
    payees,
    accounts,
    filters,
    conditionsOp,
    hidden,
    uncat,
  ]);
  const data = useReport('default', getGraphData);

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

  let [scrollWidth, setScrollWidth] = useState(0);
  const splitData = ['Month', 'Year'].includes(groupBy) ? 'monthData' : 'data';

  if (!allMonths || !data) {
    return null;
  }
  const onChangeDates = (start, end) => {
    setStart(start);
    setEnd(end);
  };

  const onResetReports = () => {
    setMode(stateDefault.mode);
    setGroupBy(stateDefault.groupBy);
    setBalanceType(stateDefault.balanceType);
    setEmpty(stateDefault.empty);
    setHidden(stateDefault.hidden);
    setUncat(stateDefault.uncat);
    setGraphType(stateDefault.graphType);
    setViewLabels(stateDefault.viewLabels);
    setViewLegend(stateDefault.viewLegend);
    setViewSummary(stateDefault.viewSummary);
    onApplyFilter(null);
    onCondOpChange('and');
    setReportId([]);
    setStart(stateDefault.start);
    setEnd(stateDefault.end);
  };

  const onReportChange = (savedReport, item) => {
    if (item === 'reload') {
      //need to pull reportsList with state change PR
    } else {
      if (savedReport.status) {
      }
    }
    setReportId({ ...reportId, ...savedReport });
  };

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
      <Header
        title="Custom Reports"
        allMonths={allMonths}
        start={start}
        end={end}
      />
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
          start={start}
          end={end}
          onChangeDates={onChangeDates}
          dateRange={dateRange}
          setDateRange={setDateRange}
          dateRangeLine={dateRangeLine}
          allMonths={allMonths}
          graphType={graphType}
          setGraphType={setGraphType}
          setViewLegend={setViewLegend}
          typeDisabled={typeDisabled}
          setTypeDisabled={setTypeDisabled}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          balanceType={balanceType}
          setBalanceType={setBalanceType}
          mode={mode}
          setMode={setMode}
          empty={empty}
          setEmpty={setEmpty}
          hidden={hidden}
          setHidden={setHidden}
          uncat={uncat}
          setUncat={setUncat}
          categories={categories}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
        />
        <View
          style={{
            flexGrow: 1,
          }}
        >
          <ReportTopbar
            start={start}
            end={end}
            mode={mode}
            empty={empty}
            hidden={hidden}
            uncat={uncat}
            graphType={graphType}
            setGraphType={setGraphType}
            viewLegend={viewLegend}
            setViewLegend={setViewLegend}
            setTypeDisabled={setTypeDisabled}
            balanceType={balanceType}
            setBalanceType={setBalanceType}
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            viewSummary={viewSummary}
            setViewSummary={setViewSummary}
            viewLabels={viewLabels}
            setViewLabels={setViewLabels}
            onApplyFilter={onApplyFilter}
            filters={filters}
            conditionsOp={conditionsOp}
            reportId={reportId}
            onReportChange={onReportChange}
            onResetReports={onResetReports}
            data={{ [splitData]: data[splitData] }}
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
                              {amountToCurrency(
                                Math.abs(
                                  data[
                                    ReportOptions.balanceTypeMap.get(
                                      balanceType,
                                    )
                                  ],
                                ),
                              )}
                            </PrivacyFilter>
                          </Text>
                        }
                      />
                    </View>
                  </View>
                )}
                <ChooseGraph
                  start={start}
                  end={end}
                  data={data}
                  mode={mode}
                  graphType={graphType}
                  balanceType={balanceType}
                  groupBy={groupBy}
                  empty={empty}
                  scrollWidth={scrollWidth}
                  setScrollWidth={setScrollWidth}
                  months={months}
                />
              </View>
              {(viewSummary || viewLegend) && (
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
                      start={start}
                      end={end}
                      balanceTypeOp={ReportOptions.balanceTypeMap.get(
                        balanceType,
                      )}
                      data={data}
                      monthsCount={months.length}
                    />
                  )}
                  {viewLegend && (
                    <ReportLegend
                      data={data}
                      legend={legend}
                      groupBy={groupBy}
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
