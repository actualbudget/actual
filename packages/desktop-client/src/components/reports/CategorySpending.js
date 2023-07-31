import React, { useState, useEffect, useMemo } from 'react';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';

import { useActions } from '../../hooks/useActions';
import { styles } from '../../style';
import View from '../common/View';

import CategorySelector from './CategorySelector';
import categorySpendingSpreadsheet from './graphs/category-spending-spreadsheet';
import CategorySpendingGraph from './graphs/CategorySpendingGraph';
import Header from './Header';
import useReport from './useReport';
import { fromDateRepr } from './util';

function CategoryAverage() {
  const { getCategories } = useActions();

  const [categories, setCategories] = useState({});
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categorySelectorVisible, setCategorySelectorVisible] = useState(false);

  const [allMonths, setAllMonths] = useState(null);

  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 5),
  );
  const [end, setEnd] = useState(monthUtils.currentMonth());

  const [numberOfMonthsAverage, setNumberOfMonthsAverage] = useState(3);

  const getGraphData = useMemo(() => {
    return categorySpendingSpreadsheet(
      start,
      end,
      numberOfMonthsAverage,
      (categories.list || []).filter(
        category =>
          !category.is_income &&
          !category.hidden &&
          selectedCategories.some(
            selectedCategory => selectedCategory.id === category.id,
          ),
      ),
    );
  }, [start, end, numberOfMonthsAverage, categories, selectedCategories]);
  const perCategorySpending = useReport('category_spending', getGraphData);

  useEffect(() => {
    getCategories().then(categories => {
      setCategories(categories);
      setSelectedCategories(categories.list);
    });
  }, []);

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

  function onChangeDates(start, end) {
    setStart(start);
    setEnd(end);
  }

  if (!allMonths || !perCategorySpending) {
    return null;
  }

  const numberOfMonthsOptions = [
    { value: 1, description: 'No averaging' },
    { value: 3, description: '3 months' },
    { value: 6, description: '6 months' },
    { value: 12, description: '12 months' },
    { value: -1, description: 'All time' },
  ];
  const numberOfMonthsLine = numberOfMonthsOptions.length - 1;

  return (
    <View style={[styles.page, { overflow: 'hidden' }]}>
      <Header
        title="Category Spending"
        allMonths={allMonths}
        start={start}
        end={end}
        onChangeDates={onChangeDates}
        numberOfMonths={numberOfMonthsAverage}
        numberOfMonthsOptions={numberOfMonthsOptions}
        numberOfMonthsLine={numberOfMonthsLine}
        onChangeNumberOfMonths={setNumberOfMonthsAverage}
        categorySelectorVisible={categorySelectorVisible}
        onChangeCategoryVisible={setCategorySelectorVisible}
      />
      <View
        style={{ display: 'flex', flexDirection: 'row', padding: 15, gap: 15 }}
      >
        <View
          style={{
            height: '360',
            overflowY: 'scroll',
            width: !categorySelectorVisible ? 0 : 'auto',
          }}
        >
          <CategorySelector
            categoryGroups={categories.grouped.filter(
              categoryGroup => !categoryGroup.is_income,
            )}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
          />
        </View>

        <View
          style={{
            flexGrow: 1,
            backgroundColor: 'white',
            padding: 30,
            overflow: 'auto',
            transition: 'flex-grow .3s linear',
          }}
        >
          <CategorySpendingGraph
            start={start}
            end={end}
            graphData={perCategorySpending}
          />
        </View>
      </View>
    </View>
  );
}

export default CategoryAverage;
