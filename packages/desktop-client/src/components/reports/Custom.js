import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useCategories from '../../hooks/useCategories';
import useFilters from '../../hooks/useFilters';
import { theme, styles } from '../../style';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';

import Change from './Change';
import AreaGraph from './graphs/AreaGraph';
import BarGraph from './graphs/BarGraph';
import BarLineGraph from './graphs/BarLineGraph';
import CustomGraph from './graphs/CustomGraph';
import DonutGraph from './graphs/DonutGraph';
import LineGraph from './graphs/LineGraph';
import StackedBarGraph from './graphs/StackedBarGraph';
import Header from './Header';
import defaultSpreadsheet from './spreadsheets/default-spreadsheet';
import useReport from './useReport';
import { fromDateRepr } from './util';

export default function Custom() {
  const [graphType, setGraphType] = useState('CustomGraph');
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
    if (graphType === 'CustomGraph') {
      return (
        <CustomGraph
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

  if (!allMonths || !data) {
    return null;
  }

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
      <Header
        title="Custom"
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
          backgroundColor: theme.tableBackground,
          padding: 30,
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
            style={{ ...styles.largeText, fontWeight: 400, marginBottom: 5 }}
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
  );
}
