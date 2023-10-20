import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useCategories from '../../hooks/useCategories';
import useFilters from '../../hooks/useFilters';
import Calculator from '../../icons/v1/Calculator';
import Chart from '../../icons/v1/Chart';
import ChartBar from '../../icons/v1/ChartBar';
import ChartPie from '../../icons/v1/ChartPie';
import InboxFull from '../../icons/v1/InboxFull';
import ListBullet from '../../icons/v1/ListBullet';
import { theme, styles } from '../../style';
import Button from '../common/Button';
import Select from '../common/Select';
import Text from '../common/Text';
import View from '../common/View';
import { FilterButton, AppliedFilters } from '../filters/FiltersMenu';
import PrivacyFilter from '../PrivacyFilter';

import Change from './Change';
import AreaGraph from './graphs/AreaGraph';
import BarGraph from './graphs/BarGraph';
import BarLineGraph from './graphs/BarLineGraph';
import DonutGraph from './graphs/DonutGraph';
import LineGraph from './graphs/LineGraph';
import StackedBarGraph from './graphs/StackedBarGraph';
import Header from './Header';
import ReportsTable from './ReportsTable';
import { ReportSplit, ReportSummary } from './ReportSummary';
import { SavedGraphMenuButton } from './SavedGraphs';
import defaultSpreadsheet from './spreadsheets/default-spreadsheet';
import useReport from './useReport';
import { fromDateRepr } from './util';

function validateStart(allMonths, start, end) {
  const earliest = allMonths[allMonths.length - 1].name;
  if (end < start) {
    end = monthUtils.addMonths(start, 6);
  }
  return boundedRange(earliest, start, end);
}

function validateEnd(allMonths, start, end) {
  const earliest = allMonths[allMonths.length - 1].name;
  if (start > end) {
    start = monthUtils.subMonths(end, 6);
  }
  return boundedRange(earliest, start, end);
}

function boundedRange(earliest, start, end) {
  const latest = monthUtils.currentMonth();
  if (end > latest) {
    end = latest;
  }
  if (start < earliest) {
    start = earliest;
  }
  return [start, end];
}

function getLatestRange(offset) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, offset);
  return [start, end];
}

function getFullRange(allMonths) {
  const start = allMonths[allMonths.length - 1].name;
  const end = monthUtils.currentMonth();
  return [start, end];
}

export default function Custom() {
  const categories = useCategories();

  let { payees, accounts } = useSelector(state => {
    return {
      payees: state.queries.payees,
      accounts: state.queries.accounts,
      //dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
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

  const [allMonths, setAllMonths] = useState(null);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 5),
  );
  const [end, setEnd] = useState(monthUtils.currentMonth());

  const [split, setSplit] = useState(1);
  const [type, setType] = useState(1);
  const [dateRange, setDateRange] = useState(2);
  const [mode, setMode] = useState('total');
  const [graphType, setGraphType] = useState('BarGraph');
  const [viewSplit, setViewSplit] = useState(false);
  const [viewSummary, setViewSummary] = useState(false);

  const months = monthUtils.rangeInclusive(start, end);
  const getGraphData = useMemo(() => {
    return defaultSpreadsheet(
      start,
      end,
      categories,
      payees,
      accounts,
      filters,
      conditionsOp,
      split,
    );
  }, [start, end, categories, payees, accounts, filters, conditionsOp, split]);
  const data = useReport('default', getGraphData);

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

  function GraphType() {
    if (graphType === 'AreaGraph') {
      return (
        <AreaGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          data={data}
          typeOp={typeOptions.find(opt => opt.value === type).format}
        />
      );
    }
    if (graphType === 'BarGraph') {
      return (
        <BarGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          data={data}
          split={split}
          typeOp={typeOptions.find(opt => opt.value === type).format}
        />
      );
    }
    if (graphType === 'BarLineGraph') {
      return (
        <BarLineGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          graphData={data.graphData}
        />
      );
    }
    if (graphType === 'DonutGraph') {
      return (
        <DonutGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          data={data}
          split={split}
          typeOp={typeOptions.find(opt => opt.value === type).format}
        />
      );
    }
    if (graphType === 'LineGraph') {
      return (
        <LineGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          graphData={data.graphData}
        />
      );
    }
    if (graphType === 'StackedBarGraph') {
      return (
        <StackedBarGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          data={data}
          typeOp={typeOptions.find(opt => opt.value === type).format}
        />
      );
    }
    if (graphType === 'TableGraph') {
      return (
        <ReportsTable
          data={data}
          style={{ border: '1px solid ' + theme.tableBorder }}
          months={months}
          type={type}
          mode={mode}
          split={splitOptions.find(opt => opt.value === split).description}
        />
      );
    }
  }

  function onChangeDates(start, end) {
    setStart(start);
    setEnd(end);
  }

  function onChangeMode(cond) {
    setMode(cond);
    if (graphType === 'StackedBarGraph' && cond === 'total') {
      setGraphType('BarGraph');
    }
    if (graphType === 'BarGraph' && cond === 'time') {
      setGraphType('StackedBarGraph');
    }
    if (
      cond === 'time' &&
      (graphType === 'AreaGraph' || graphType === 'DonutGraph')
    ) {
      setGraphType('TableGraph');
    }
  }

  function onChangeGraph(cond) {
    setGraphType(cond);
  }

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

  function ModeButton({ selected, children, style, onSelect }) {
    return (
      <Button
        type="bare"
        style={{
          padding: '5px 10px',
          backgroundColor: theme.menuBackground,
          marginRight: 5,
          fontSize: 'inherit',
          ...(selected && {
            backgroundColor: theme.buttonPrimaryBackground,
            color: theme.buttonPrimaryText,
            ':hover': {
              backgroundColor: theme.buttonPrimaryBackgroundHover,
              color: theme.buttonPrimaryTextHover,
            },
          }),
          ...style,
        }}
        onClick={onSelect}
      >
        {children}
      </Button>
    );
  }

  if (!allMonths || !data) {
    return null;
  }

  const splitOptions = [
    { value: 1, description: 'Category' },
    { value: 2, description: 'Group' },
    { value: 3, description: 'Payee' },
    { value: 4, description: 'Account' },
    { value: 5, description: 'Month' },
    { value: 6, description: 'Year' },
  ];

  const typeOptions = [
    { value: 1, description: 'Expense', format: 'totalDebts' },
    { value: 2, description: 'Income', format: 'totalAssets' },
    { value: 3, description: 'All', format: 'totalTotals' },
  ];

  const dateRangeOptions = [
    { value: 0, description: '1 month', name: 1 },
    { value: 1, description: '3 months', name: 2 },
    { value: 2, description: '6 months', name: 5 },
    { value: 3, description: '1 year', name: 11 },
    { value: 4, description: 'All time', name: allMonths },
  ];
  const dateRangeLine = dateRangeOptions.length - 1;

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
        <View style={{ width: 200, padding: 10, paddingLeft: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              marginBottom: 5,
              alignItems: 'center',
            }}
          >
            <Text>
              <strong>Display</strong>
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
              Mode:
            </Text>
            <ModeButton
              selected={mode === 'total'}
              onSelect={() => onChangeMode('total')}
            >
              Total
            </ModeButton>
            <ModeButton
              selected={mode === 'time'}
              onSelect={() => onChangeMode('time')}
            >
              Time
            </ModeButton>
          </View>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
              Split:
            </Text>
            <Select
              value={split}
              onChange={setSplit}
              options={splitOptions.map(option => [
                option.value,
                option.description,
              ])}
              disabledKeys={
                mode === 'time'
                  ? [5, 6]
                  : graphType === 'AreaGraph'
                  ? [1, 2, 3, 4]
                  : [0]
              }
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
              Type:
            </Text>
            <Select
              value={type}
              onChange={setType}
              options={typeOptions.map(option => [
                option.value,
                option.description,
              ])}
              disabledKeys={
                mode === 'total' && graphType === 'DonutGraph' ? [3] : [0]
              }
            />
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: theme.altPillBorder,
              marginTop: 10,
              flexShrink: 0,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              marginTop: 10,
              marginBottom: 5,
              alignItems: 'center',
            }}
          >
            <Text>
              <strong>Date filters</strong>
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
              Range:
            </Text>
            <Select
              value={dateRange}
              onChange={e => {
                setDateRange(dateRangeOptions[e].value);
                if (e === 4) {
                  onChangeDates(...getFullRange(allMonths));
                } else {
                  onChangeDates(...getLatestRange(dateRangeOptions[e].name));
                }
              }}
              options={dateRangeOptions.map(option => [
                option.value,
                option.description,
              ])}
              line={dateRangeLine}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
              From:
            </Text>
            <Select
              onChange={newValue =>
                onChangeDates(...validateStart(allMonths, newValue, end))
              }
              value={start}
              defaultLabel={monthUtils.format(start, 'MMMM, yyyy')}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
              To:
            </Text>
            <Select
              onChange={newValue =>
                onChangeDates(...validateEnd(allMonths, start, newValue))
              }
              value={end}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
            />
          </View>
        </View>
        <View
          style={{
            flexGrow: 1,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <GraphButton
              selected={graphType === 'TableGraph'}
              onSelect={() => onChangeGraph('TableGraph')}
            >
              <InboxFull width={15} height={15} />
            </GraphButton>
            <GraphButton
              selected={
                graphType === 'BarGraph' || graphType === 'StackedBarGraph'
              }
              onSelect={() => {
                if (mode === 'total') {
                  onChangeGraph('BarGraph');
                } else {
                  onChangeGraph('StackedBarGraph');
                }
              }}
              style={{ marginLeft: 15 }}
            >
              <ChartBar width={15} height={15} />
            </GraphButton>
            <GraphButton
              selected={graphType === 'AreaGraph'}
              onSelect={() => {
                onChangeGraph('AreaGraph');
                setSplit(5);
              }}
              style={{ marginLeft: 15 }}
              disabled={mode === 'total' ? false : true}
            >
              <Chart width={15} height={15} />
            </GraphButton>
            <GraphButton
              selected={graphType === 'DonutGraph'}
              onSelect={() => {
                onChangeGraph('DonutGraph');
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
                marginLeft: 20,
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
            <View
              style={{
                width: 1,
                height: 30,
                backgroundColor: theme.altPillBorder,
                marginLeft: 20,
                flexShrink: 0,
              }}
            />
            <FilterButton onApply={onApplyFilter} type="reports" />
            <View style={{ flex: 1 }} />
            <SavedGraphMenuButton />
          </View>
          {filters && filters.length > 0 && (
            <View
              style={{ marginBottom: 10, marginLeft: 5 }}
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
            {graphType !== 'TableGraph' && (
              <View
                style={{
                  textAlign: 'right',
                  paddingTop: 10,
                  paddingRight: 20,
                  flexShrink: 0,
                }}
              >
                <View
                  style={{
                    ...styles.largeText,
                    fontWeight: 400,
                    marginBottom: 5,
                  }}
                >
                  <PrivacyFilter blurIntensity={5}>
                    {integerToCurrency(0)}
                  </PrivacyFilter>
                </View>
                <PrivacyFilter>
                  <Change amount={0} />
                </PrivacyFilter>
              </View>
            )}
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
                  paddingTop: 0,
                }}
              >
                <GraphType />
              </View>
              {(viewSplit || viewSummary) && (
                <View>
                  <View
                    style={{
                      padding: 10,
                      flexDirection: 'column',
                      minWidth: 300,
                      marginTop: 15,
                      marginRight: 10,
                      textAlign: 'center',
                      flexGrow: 1,
                    }}
                  >
                    {viewSummary && (
                      <ReportSummary
                        start={start}
                        end={end}
                        totalExpenses={data.totalDebts}
                        totalIncome={data.totalAssets}
                        totalNet={data.totalTotals}
                        selectType={
                          typeOptions.find(opt => opt.value === type)
                            .description
                        }
                      />
                    )}
                    {viewSplit && (
                      <ReportSplit
                        data={data}
                        splitType={
                          splitOptions.find(opt => opt.value === split)
                            .description
                        }
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
