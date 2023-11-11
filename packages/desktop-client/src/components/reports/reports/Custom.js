import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

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
import Header from '../Header';
import { CustomSidebar } from '../ReportSidebar';
import { ReportSplit, ReportSummary } from '../ReportSummary';
import { CustomTopbar } from '../ReportTopbar';
import defaultSpreadsheet from '../spreadsheets/default-spreadsheet';
import useReport from '../useReport';
import { fromDateRepr } from '../util';

let legend = [];

function OnChangeLegend(leg) {
  useEffect(() => {
    legend = leg;
  }, []);
}

export default function Custom() {
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

  const [selectedCategories, setSelectedCategories] = useState(null);
  const [allMonths, setAllMonths] = useState(null);
  const [typeDisabled, setTypeDisabled] = useState([3]);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 5),
  );
  const [end, setEnd] = useState(monthUtils.currentMonth());

  const [mode, setMode] = useState('total');
  const [split, setSplit] = useState(1);
  const [type, setType] = useState(1);
  //const [interval, setInterval] = useState(4);
  const [empty, setEmpty] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [uncat, setUncat] = useState(false);
  const [dateRange, setDateRange] = useState(2);

  const [graphType, setGraphType] = useState('BarGraph');
  const [viewSplit, setViewSplit] = useState(false);
  const [viewSummary, setViewSummary] = useState(false);
  const [viewLabels, setViewLabels] = useState(false);

  const typeOptions = [
    { value: 1, description: 'Expense', format: 'totalDebts' },
    { value: 2, description: 'Income', format: 'totalAssets' },
    { value: 3, description: 'Net', format: 'totalTotals' },
  ];

  const splitOptions = [
    { value: 1, description: 'Category' },
    { value: 2, description: 'Group' },
    { value: 3, description: 'Payee' },
    { value: 4, description: 'Account' },
    { value: 5, description: 'Month' },
    { value: 6, description: 'Year' },
  ];

  const dateRangeOptions = [
    { value: 0, description: '1 month', name: 1 },
    { value: 1, description: '3 months', name: 2 },
    { value: 2, description: '6 months', name: 5 },
    { value: 3, description: '1 year', name: 11 },
    { value: 4, description: 'All time', name: allMonths },
  ];
  const dateRangeLine = dateRangeOptions.length - 1;

  /*
  const intervalOptions = [
    { value: 1, description: 'Daily', name: 1 },
    { value: 2, description: 'Weekly', name: 2 },
    { value: 3, description: 'Fortnightly', name: 3 },
    { value: 4, description: 'Monthly', name: 4 },
    { value: 5, description: 'Yearly', name: 5 },
  ];
  */

  const months = monthUtils.rangeInclusive(start, end);
  const getGraphData = useMemo(() => {
    return defaultSpreadsheet(
      start,
      end,
      split,
      typeOptions.find(opt => opt.value === type).format,
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
    split,
    type,
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
  }, [categories, selectedCategories, split]);

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

  if (!allMonths || !data) {
    return null;
  }

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
        <CustomSidebar
          start={start}
          setStart={setStart}
          end={end}
          setEnd={setEnd}
          dateRange={dateRange}
          setDateRange={setDateRange}
          dateRangeOptions={dateRangeOptions}
          dateRangeLine={dateRangeLine}
          allMonths={allMonths}
          graphType={graphType}
          setGraphType={setGraphType}
          setViewSplit={setViewSplit}
          typeDisabled={typeDisabled}
          setTypeDisabled={setTypeDisabled}
          split={split}
          setSplit={setSplit}
          splitOptions={splitOptions}
          type={type}
          setType={setType}
          typeOptions={typeOptions}
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
          <CustomTopbar
            graphType={graphType}
            setGraphType={setGraphType}
            mode={mode}
            viewSplit={viewSplit}
            setViewSplit={setViewSplit}
            setTypeDisabled={setTypeDisabled}
            type={type}
            setType={setType}
            split={split}
            setSplit={setSplit}
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
                        left={
                          <Block>
                            {
                              typeOptions.find(opt => opt.value === type)
                                .description
                            }
                            :
                          </Block>
                        }
                        right={
                          <Text>
                            <PrivacyFilter blurIntensity={5}>
                              {amountToCurrency(
                                Math.abs(
                                  data[
                                    typeOptions.find(opt => opt.value === type)
                                      .format
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
                  type={type}
                  typeOptions={typeOptions}
                  split={split}
                  splitOptions={splitOptions}
                  empty={empty}
                  scrollWidth={scrollWidth}
                  setScrollWidth={setScrollWidth}
                  months={months}
                  OnChangeLegend={OnChangeLegend}
                />
              </View>
              {(viewSplit || viewSummary) && (
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
                      typeOp={
                        typeOptions.find(opt => opt.value === type).format
                      }
                      data={data}
                      monthsCount={months.length}
                    />
                  )}
                  {viewSplit && (
                    <ReportSplit
                      data={data}
                      legend={legend}
                      splitType={
                        splitOptions.find(opt => opt.value === split)
                          .description
                      }
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
