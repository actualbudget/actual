import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import * as d from 'date-fns';

import { initiallyLoadPayees } from 'loot-core/src/client/actions';
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
import { LoadComponent } from '../../util/LoadComponent';
import { ChooseGraph } from '../ChooseGraph';
import Header from '../Header';
import { ReportOptions } from '../ReportOptions';
import { ReportSidebar } from '../ReportSidebar';
import { ReportLegend, ReportSummary } from '../ReportSummary';
import { ReportTopbar } from '../ReportTopbar';
import defaultSpreadsheet from '../spreadsheets/default-spreadsheet';
import useReport from '../useReport';
import { fromDateRepr } from '../util';

export default function CustomReport() {
  const categories = useCategories();
  let dispatch = useDispatch();

  const {
    filters,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onCondOpChange,
  } = useFilters();

  const [selectedCategories, setSelectedCategories] = useState(null);
  const [allMonths, setAllMonths] = useState(null);
  const [typeDisabled, setTypeDisabled] = useState(['Net']);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 5),
  );
  const [end, setEnd] = useState(monthUtils.currentMonth());

  const [mode, setMode] = useState('total');
  const [groupBy, setGroupBy] = useState('Category');
  const [balanceType, setBalanceType] = useState('Expense');
  const [empty, setEmpty] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [uncat, setUncat] = useState(false);
  const [dateRange, setDateRange] = useState('6 months');
  const [dataCheck, setDataCheck] = useState(false);

  const [graphType, setGraphType] = useState('BarGraph');
  const [viewLegend, setViewLegend] = useState(false);
  const [viewSummary, setViewSummary] = useState(false);
  const [viewLabels, setViewLabels] = useState(false);
  //const [legend, setLegend] = useState([]);
  let legend = [];
  const dateRangeLine = ReportOptions.dateRange.length - 3;
  const months = monthUtils.rangeInclusive(start, end);

  useEffect(() => {
    if (selectedCategories === null && categories.list.length !== 0) {
      setSelectedCategories(categories.list);
    }
  }, [categories, selectedCategories]);

  useEffect(() => {
    async function run() {
      dispatch(initiallyLoadPayees());
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

  let { payees, accounts } = useSelector(state => {
    return {
      payees: state.queries.payees,
      accounts: state.queries.accounts,
    };
  });

  const getGraphData = useMemo(() => {
    setDataCheck(false);
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
      setDataCheck,
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

  let [scrollWidth, setScrollWidth] = useState(0);

  if (!allMonths || !data) {
    return null;
  }

  const onChangeDates = (start, end) => {
    setStart(start);
    setEnd(end);
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
            graphType={graphType}
            setGraphType={setGraphType}
            mode={mode}
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

                {dataCheck ? (
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
                ) : (
                  <LoadComponent message={'Loading report...'} />
                )}
              </View>
              {(viewLegend || viewSummary) && (
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
