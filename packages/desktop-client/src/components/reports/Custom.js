import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useCategories from '../../hooks/useCategories';
import useFilters from '../../hooks/useFilters';
import Chart from '../../icons/v1/Chart';
import ChartBar from '../../icons/v1/ChartBar';
import ChartPie from '../../icons/v1/ChartPie';
import Filter from '../../icons/v1/Filter';
import ListBullet from '../../icons/v1/ListBullet';
import { theme, styles } from '../../style';
import Button from '../common/Button';
import Select from '../common/Select';
import Text from '../common/Text';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';

import Change from './Change';
import AreaGraph from './graphs/AreaGraph';
import BarGraph from './graphs/BarGraph';
import BarLineGraph from './graphs/BarLineGraph';
import DonutGraph from './graphs/DonutGraph';
import LineGraph from './graphs/LineGraph';
import StackedBarGraph from './graphs/StackedBarGraph';
import Header from './Header';
import { SavedGraphMenuButton } from './SavedGraphs';
import defaultSpreadsheet from './spreadsheets/default-spreadsheet';
import useReport from './useReport';
import { fromDateRepr } from './util';

export default function Custom() {
  const [graphType, setGraphType] = useState('AreaGraph');
  const categories = useCategories();
  const [selectedCategories, setSelectedCategories] = useState(null);
  useEffect(() => {
    if (selectedCategories === null && categories.list.length !== 0) {
      setSelectedCategories(categories.list);
    }
  }, [categories, selectedCategories]);

  let accounts = useSelector(state => state.queries.accounts);
  const {
    filters,
    saved,
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
  const [dateRange, setDateRange] = useState(6);
  const [mode, setMode] = useState('time');

  const getGraphData = useMemo(() => {
    return defaultSpreadsheet(
      start,
      end,
      accounts,
      filters,
      conditionsOp,
      (categories.list || []).filter(
        category =>
          !category.is_income &&
          !category.hidden &&
          selectedCategories &&
          selectedCategories.some(
            selectedCategory => selectedCategory.id === category.id,
          ),
      ),
    );
  }, [
    start,
    end,
    accounts,
    filters,
    conditionsOp,
    categories,
    selectedCategories,
  ]);
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

  function selectGraph(graph) {
    setGraphType(graph);
  }

  function GraphType() {
    if (graphType === 'AreaGraph') {
      return (
        <AreaGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          graphData={data.graphData}
        />
      );
    }
    if (graphType === 'BarGraph') {
      return (
        <BarGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          graphData={data.graphData}
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
          graphData={data.graphData}
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
          graphData={data.graphData}
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
    { value: 5, description: 'Day' },
    { value: 6, description: 'Month' },
    { value: 7, description: 'Year' },
  ];

  const typeOptions = [
    { value: 1, description: 'Expense' },
    { value: 2, description: 'Income' },
    { value: 3, description: 'All' },
  ];

  const dateRangeOptions = [
    { value: 1, description: '1 month' },
    { value: 3, description: '3 months' },
    { value: 6, description: '6 months' },
    { value: 12, description: '1 year' },
    { value: -1, description: 'All time' },
  ];
  const dateRangeLine = dateRangeOptions.length - 1;

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
      <Header
        title="Custom Reports"
        allMonths={allMonths}
        start={start}
        end={end}
        onChangeDates={onChangeDates}
        filters={filters}
        saved={saved}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onCondOpChange={onCondOpChange}
        selectGraph={selectGraph}
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
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
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
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              Split:
            </Text>
            <Select
              value={split}
              onChange={setSplit}
              options={splitOptions.map(option => [
                option.value,
                option.description,
              ])}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              Type:
            </Text>
            <Select
              value={type}
              onChange={setType}
              options={typeOptions.map(option => [
                option.value,
                option.description,
              ])}
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
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              Range:
            </Text>
            <Select
              value={dateRange}
              onChange={setDateRange}
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
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              From:
            </Text>
            <Select
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
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              To:
            </Text>
            <Select
              value={end}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
            />
          </View>
        </View>
        <View
          style={{
            flexGrow: 1,
            padding: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: -20,
              flexGrow: 1,
            }}
          >
            <Button type="bare" onClick={() => {}}>
              <Chart width={15} height={15} />
            </Button>
            <Button type="bare" onClick={() => {}} style={{ marginLeft: 15 }}>
              <ChartBar width={15} height={15} />
            </Button>
            <Button type="bare" onClick={() => {}} style={{ marginLeft: 15 }}>
              <ChartPie width={15} height={15} />
            </Button>
            <View
              style={{
                width: 1,
                height: 30,
                backgroundColor: theme.altPillBorder,
                marginLeft: 20,
                flexShrink: 0,
              }}
            />
            <Button type="bare" onClick={() => {}} style={{ marginLeft: 15 }}>
              <ListBullet width={15} height={15} />
            </Button>
            <Button type="bare" onClick={() => {}} style={{ marginLeft: 15 }}>
              <Filter width={15} height={15} />
            </Button>
            <View style={{ flex: 1 }} />
            <SavedGraphMenuButton />
          </View>
          <View
            style={{
              backgroundColor: theme.tableBackground,
              padding: 20,
              paddingTop: 0,
              overflow: 'auto',
              flexGrow: 1,
            }}
          >
            <View
              style={{
                textAlign: 'right',
                paddingTop: 20,
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
                  {integerToCurrency(data.netWorth)}
                </PrivacyFilter>
              </View>
              <PrivacyFilter>
                <Change amount={data.totalChange} />
              </PrivacyFilter>
            </View>

            <GraphType />
          </View>
        </View>
      </View>
    </View>
  );
}
