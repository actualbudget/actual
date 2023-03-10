import React, { useState, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';

import * as d from 'date-fns';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { View, P } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

import { ChooseChart, ChooseChartHeader, ChartExtraColumn } from './Charts';
import { HeaderReports, HeaderFilters } from './Header';
import { masterDataSpreadsheet } from './spreadsheets/master-spreadsheet';
import useReport from './useReport';

function AllReports({ categories }) {
  const [filters, setFilters] = useState({ filters: [], conditions: [] });
  const [disableFilter, setDisableFilter] = useState(true);
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

  function reportDescription() {
    const title = (() => {
      if (reportPage === 'NetWorth') {
        return <strong>How is net worth calculated?</strong>;
      }
      if (reportPage === 'CashFlow') {
        return <strong>How is cash flow calculated?</strong>;
      }
      if (reportPage === 'IE') {
        return <strong>How are income and expenses calculated?</strong>;
      }
    })();
    const description = (() => {
      if (reportPage === 'NetWorth') {
        return (
          <P>
            Net worth shows the balance of all accounts over time, including all
            of your investments. Your "net worth" is considered to be the amount
            you'd have if you sold all your assets and paid off as much debt as
            possible. If you hover over the graph, you can also see the amount
            of assets and debt individually.
          </P>
        );
      }
      if (reportPage === 'CashFlow') {
        return (
          <P>
            Cash flow shows the balance of your budgeted accounts over time, and
            the amount of expenses/income each day or month. Your budgeted
            accounts are considered to be &quot;cash on hand&quot;, so this
            gives you a picture of how available money fluctuates.
          </P>
        );
      }
      if (reportPage === 'IE') {
        return (
          <P>
            These charts show your income/expenses as a total or over time and
            is based on your filters. This allows you to look at accounts or
            payees or categories and track money spent in any way you like.
          </P>
        );
      }
    })();
    return (
      <View style={{ marginTop: 30 }}>
        <P>{title}</P>
        {description}
      </View>
    );
  }

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
    setDisableFilter(disable);
    setSecondaryReport('Trends');
    disable && deleteAllFilters();
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

      let filte = [...filters];
      setFilters({ filters: filte, conditions: conditions });
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

  if (!allMonths || !data) {
    return null;
  }

  function handleChange(value) {
    setSelectList(value);
  }

  function onSecondaryClick(id) {
    setSecondaryReport(id);
    id === 'Totals' && setSelectList('Expense');
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
          color: colors.n7,
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
        onApplyFilter={onApplyFilter}
        onDeleteFilter={onDeleteFilter}
        disableFilter={disableFilter}
        filters={filters.conditions}
      />
      <View
        style={{
          backgroundColor: 'white',
          paddingLeft: 30,
          paddingRight: 30,
          overflow: 'auto',
        }}
      >
        <View
          style={{
            flexShrink: 0,
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingTop: 0,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              overflow: 'auto',
              flexGrow: 1,
              padding: 10,
            }}
          >
            <ChooseChartHeader
              start={start}
              end={monthUtils.getMonth(end)}
              reportPage={reportPage}
              secondaryReport={secondaryReport}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              totalChanges={totalChanges}
              netWorth={netWorth}
              onSecondaryClick={onSecondaryClick}
              selectList={selectList}
              handleChange={handleChange}
            />

            <ChooseChart
              start={start}
              end={end}
              graphData={graphData}
              catData={catData}
              isConcise={isConcise}
              selectList={selectList}
              reportPage={reportPage}
              secondaryReport={secondaryReport}
            />
          </View>
          {reportPage === 'IE' && (
            <ChartExtraColumn
              start={start}
              end={monthUtils.getMonth(end)}
              reportPage={reportPage}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              selectList={selectList}
            />
          )}
        </View>
        {reportDescription()}
      </View>
    </View>
  );
}

export default connect(
  state => ({ categories: state.queries.categories }),
  dispatch => bindActionCreators(actions, dispatch),
)(AllReports);
