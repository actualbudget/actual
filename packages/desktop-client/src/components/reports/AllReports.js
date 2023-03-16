import React, { useState, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';

import * as d from 'date-fns';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { View } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

import CashFlowReport from './CashFlowReport';
import { HeaderReports, HeaderFilters } from './Header';
import IncomeExpenseReport from './IncomeExpenseReport';
import NetWorthReport from './NetWorthReport';
import { masterDataSpreadsheet } from './spreadsheets/master-spreadsheet';
import useReport from './useReport';

function AllReports({ categories }) {
  const [filters, setFilters] = useState({ filters: [], conditions: [] });
  const [secondaryReport, setSecondaryReport] = useState('Trends');
  const [reportPage, setReportPage] = useState('CashFlow');
  const [selectList, setSelectList] = useState('Expense');
  const [allMonths, setAllMonths] = useState(null);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 5),
  );
  const [end, setEnd] = useState(monthUtils.currentDay());

  const [isConcise, setIsConcise] = useState(() => {
    const numDays = d.differenceInCalendarDays(
      d.parseISO(end),
      d.parseISO(start),
    );
    return numDays > 31 * 3;
  });

  const params = useMemo(
    () =>
      masterDataSpreadsheet(
        start,
        end,
        isConcise,
        selectList,
        filters.filters,
        categories,
        reportPage,
      ),
    [
      start,
      end,
      isConcise,
      selectList,
      filters.filters,
      categories,
      reportPage,
    ],
  );
  const data = useReport('master-sheet', params);

  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      const earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(trans.date))
        : monthUtils.currentMonth();

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

  function onReportClick(onSelection, disable) {
    setReportPage(onSelection);
    disable && deleteAllFilters();
  }

  function onUpdateFilter(oldFilter, updatedFilter) {
    applyFilters(
      filters.conditions.map(f => (f === oldFilter ? updatedFilter : f)),
    );
  }

  function onDeleteFilter(filter) {
    applyFilters(filters.conditions.filter(f => f !== filter));
  }

  function deleteAllFilters() {
    applyFilters([]);
  }

  async function onApplyFilter(cond) {
    let filter = filters.conditions;
    applyFilters([...filter, cond]);
  }

  async function applyFilters(conditions) {
    if (conditions.length > 0) {
      let { filters } = await send('make-filters-from-conditions', {
        conditions,
      });

      setFilters({ filters, conditions });
    } else {
      setFilters({ filters: [], conditions: conditions });
    }
  }

  function onChangeDates(start, end) {
    const numDays = d.differenceInCalendarDays(
      d.parseISO(end),
      d.parseISO(start),
    );
    const isConcise = numDays > 31 * 3;

    let endDay = end + '-31';
    if (endDay > monthUtils.currentDay()) {
      endDay = monthUtils.currentDay();
    }

    setStart(start + '-01');
    setEnd(endDay);
    setIsConcise(reportPage === 'CashFlow' ? isConcise : true);
  }

  function handleChange(value) {
    setSelectList(value);
  }

  function onSecondaryClick(id) {
    setSecondaryReport(id);
    id === 'Totals' && setSelectList('Expense');
  }

  if (!allMonths || !data) {
    return null;
  }

  const {
    graphData,
    catData,
    totalExpenses,
    totalIncome,
    netWorth,
    totalChanges,
  } = data;

  return (
    <View style={[styles.page, { minWidth: 650, overflow: 'hidden' }]}>
      <View
        style={{
          paddingTop: 0,
          flexShrink: 0,
          flexDirection: 'row',
          color: colors.n3,
        }}
      >
        <HeaderReports
          title="Net Worth"
          id="NetWorth"
          onReportClick={() => {
            onReportClick('NetWorth', true);
          }}
          reportPage={reportPage}
        />
        <HeaderReports
          title="Cash Flow"
          id="CashFlow"
          onReportClick={() => {
            onReportClick('CashFlow', true);
          }}
          reportPage={reportPage}
        />
        <HeaderReports
          title="Income & Expense"
          id="IE"
          onReportClick={() => {
            onReportClick('IE', false);
          }}
          reportPage={reportPage}
        />
      </View>

      <HeaderFilters
        allMonths={allMonths}
        start={monthUtils.getMonth(start)}
        end={monthUtils.getMonth(end)}
        show1Month={reportPage === 'NetWorth' ? false : true}
        showAllTime={reportPage === 'IE' ? false : true}
        onChangeDates={onChangeDates}
      />
      {reportPage === 'CashFlow' && (
        <CashFlowReport
          start={start}
          end={end}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          graphData={graphData}
          isConcise={isConcise}
        />
      )}
      {reportPage === 'NetWorth' && (
        <NetWorthReport
          start={start}
          end={end}
          totalChanges={totalChanges}
          netWorth={netWorth}
          graphData={graphData}
        />
      )}
      {reportPage === 'IE' && (
        <IncomeExpenseReport
          start={start}
          end={end}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          graphData={graphData}
          catData={catData}
          secondaryReport={secondaryReport}
          selectList={selectList}
          onSecondaryClick={onSecondaryClick}
          handleChange={handleChange}
          onApplyFilter={onApplyFilter}
          onDeleteFilter={onDeleteFilter}
          onUpdateFilter={onUpdateFilter}
          filters={filters.conditions}
        />
      )}
    </View>
  );
}

export default connect(
  state => ({ categories: state.queries.categories }),
  dispatch => bindActionCreators(actions, dispatch),
)(AllReports);
