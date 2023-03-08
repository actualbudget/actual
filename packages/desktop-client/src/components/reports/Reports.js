import React, { useState, useEffect } from 'react';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { View, P } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

import { ChooseChart, ChooseChartHeader, ChartExtraColumn } from './Charts';
import Header from './Header';
import { HeaderReport } from './Header';
import { masterDataSpreadsheet } from './spreadsheets/master-spreadsheet';
import useReport from './useReport';
import { useArgsMemo } from './util';

function AllReports() {
  const [filterz, setFilterz] = useState([]);
  const [filt, setFilt] = useState([]);
  const [disableFilter, setDisableFilter] = useState(true);
  const [isCashFlow, setIsCashFlow] = useState(true);
  const [isIE, setIsIE] = useState(false);
  const [isTotals, setIsTotals] = useState(false);
  const [isTrends, setIsTrends] = useState(false);
  const [isNetWorth, setIsNetWorth] = useState(false);
  const [selectList, setSelectList] = useState('Expense');

  const [allMonths, setAllMonths] = useState(null);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 30),
  );
  const end = monthUtils.currentMonth();
  const [endDay, setEndDay] = useState(monthUtils.currentDay());

  const [isConcise, setIsConcise] = useState(() => {
    const numDays = d.differenceInCalendarDays(
      d.parseISO(end),
      d.parseISO(start),
    );
    return numDays > 31 * 3;
  });

  const reportDescription = (() => {
    if (isNetWorth) {
      return (
        <P>
          Net worth shows the balance of all accounts over time, including all
          of your investments. Your "net worth" is considered to be the amount
          you'd have if you sold all your assets and paid off as much debt as
          possible. If you hover over the graph, you can also see the amount of
          assets and debt individually.
        </P>
      );
    }

    if (isCashFlow) {
      return (
        <P>
          Cash flow shows the balance of your budgeted accounts over time, and
          the amount of expenses/income each day or month. Your budgeted
          accounts are considered to be &quot;cash on hand&quot;, so this gives
          you a picture of how available money fluctuates.
        </P>
      );
    }

    if (isIE) {
      return (
        <P>
          These charts show your income/expenses as a total or over time and is
          based on your filters. This allows you to look at accounts or payees
          or categories and track money spent in any way you like.
        </P>
      );
    }
  })();

  const reportDescriptionTitle = (() => {
    if (isNetWorth) {
      return (
        <P>
          <strong>How is net worth calculated?</strong>
        </P>
      );
    }

    if (isCashFlow) {
      return (
        <P>
          <strong>How is cash flow calculated?</strong>
        </P>
      );
    }

    if (isIE) {
      return (
        <P>
          <strong>How are income and expenses calculated?</strong>
        </P>
      );
    }
  })();

  const spreadSheet = (() => {
    return isCashFlow
      ? 'cash-flow'
      : isNetWorth
      ? 'net-worth'
      : isIE && 'ie-sheet';
  })();

  const data = useReport(
    spreadSheet,
    useArgsMemo(masterDataSpreadsheet)(
      start,
      end,
      endDay,
      isTotals,
      isConcise,
      selectList,
      isCashFlow,
      isNetWorth,
      isIE,
      filt,
    ),
  );

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

  function onSelection(onSelection) {
    setIsCashFlow(false);
    setIsNetWorth(false);
    setIsIE(false);
    onSelection(true);
  }

  function onDeleteFilter(filter) {
    applyFilters(filterz.filter(f => f !== filter));
  }

  function deleteAllFilters() {
    applyFilters([]);
  }

  async function onApplyFilter(cond) {
    let filters = filterz;
    applyFilters([...filters, cond]);
  }

  async function applyFilters(conditions) {
    if (conditions.length > 0) {
      let { filters } = await send('make-filters-from-conditions', {
        conditions,
      });

      let filte = [...filters];
      setFilt(filte);
      setFilterz(conditions);
    } else {
      setFilt([]);
      setFilterz(conditions);
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
    setEndDay(endDay);
    setIsConcise(isNetWorth || isIE ? true : isConcise);
  }

  if (!allMonths || !data) {
    return null;
  }

  const handleChange = e => {
    setSelectList(e.target.value);
  };

  const handleClick = e => {
    if (
      e.target.id === 'TotalsChoice' ||
      e.target.parentElement.id === 'TotalsChoice'
    ) {
      setIsTotals(true);
      setSelectList('Expense');
    } else {
      setIsTotals(false);
    }

    e.target.id === 'TrendsChoice' ||
    e.target.parentElement.id === 'TrendsChoice'
      ? setIsTrends(true)
      : setIsTrends(false);
  };

  const handleMouseHoverHeader = e => {
    if (isNetWorth && e.target.id !== 'netWorthHeader') {
      e.target.style.color = colors.b4;
      e.target.style.cursor = 'pointer';
    }
    if (isCashFlow && e.target.id !== 'cashFlowHeader') {
      e.target.style.color = colors.b4;
      e.target.style.cursor = 'pointer';
    }
    if (isIE && e.target.id !== 'iEHeader') {
      e.target.style.color = colors.b4;
      e.target.style.cursor = 'pointer';
    }
  };

  const handleMouseLeaveHeader = e => {
    if (isNetWorth && e.target.id !== 'netWorthHeader') {
      e.target.style.color = colors.n7;
      e.target.style.cursor = 'inherit';
    }
    if (isCashFlow && e.target.id !== 'cashFlowHeader') {
      e.target.style.color = colors.n7;
      e.target.style.cursor = 'inherit';
    }
    if (isIE && e.target.id !== 'iEHeader') {
      e.target.style.color = colors.n7;
      e.target.style.cursor = 'inherit';
    }
  };

  const onHeaderClick = (e, disable) => {
    //setIsTrends(false);

    e.target.style.cursor = 'inherit';

    document.getElementById('netWorthHeader').style.color = colors.n7;
    document.getElementById('cashFlowHeader').style.color = colors.n7;
    document.getElementById('iEHeader').style.color = colors.n7;

    document.getElementById(e.target.id).style.color = colors.n3;

    setDisableFilter(disable);

    e.target.id === 'netWorthHeader'
      ? setIsNetWorth(true)
      : setIsNetWorth(false);

    e.target.id === 'cashFlowHeader'
      ? setIsCashFlow(true)
      : setIsCashFlow(false);

    e.target.id === 'iEHeader' ? setIsIE(true) : setIsIE(false);
  };

  const { graphData, totalExpenses, totalIncome, netWorth, totalChanges } =
    data;

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
        <HeaderReport
          title="Net Worth"
          id="netWorthHeader"
          handleMouseHover={handleMouseHoverHeader}
          handleMouseLeaveHeader={handleMouseLeaveHeader}
          onHeaderClick={e => {
            setIsTrends(true);
            onHeaderClick(e, true);
            deleteAllFilters();
            onSelection(setIsNetWorth);
            setIsTotals(false);
          }}
          isElement={isNetWorth}
          isDefault={false}
        />
        <HeaderReport
          title="Cash Flow"
          id="cashFlowHeader"
          handleMouseHover={handleMouseHoverHeader}
          handleMouseLeaveHeader={handleMouseLeaveHeader}
          onHeaderClick={e => {
            setIsTrends(true);
            onHeaderClick(e, true);
            deleteAllFilters();
            onSelection(setIsCashFlow);
            setIsTotals(false);
          }}
          isElement={isCashFlow}
          isDefault={true}
        />
        <HeaderReport
          title="Income & Expense"
          id="iEHeader"
          handleMouseHover={handleMouseHoverHeader}
          handleMouseLeaveHeader={handleMouseLeaveHeader}
          onHeaderClick={e => {
            setIsTrends(true);
            onHeaderClick(e, false);
            onSelection(setIsIE);
            setIsTotals(false);
          }}
          isElement={isIE}
          isDefault={false}
        />
      </View>

      <Header
        allMonths={allMonths}
        start={monthUtils.getMonth(start)}
        end={monthUtils.getMonth(end)}
        show1Month={!isNetWorth}
        showAllTime={isIE}
        onChangeDates={onChangeDates}
        onApplyFilter={onApplyFilter}
        onDeleteFilter={onDeleteFilter}
        disableFilter={disableFilter}
        filters={filterz}
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
              end={end}
              isNetWorth={isNetWorth}
              isCashFlow={isCashFlow}
              isIE={isIE}
              isTotals={isTotals}
              isTrends={isTrends}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              totalChanges={totalChanges}
              netWorth={netWorth}
              handleClick={handleClick}
              selectList={selectList}
              handleChange={handleChange}
            />

            <ChooseChart
              start={start}
              end={end}
              endDay={endDay}
              graphData={graphData}
              isConcise={isConcise}
              selectList={selectList}
              isNetWorth={isNetWorth}
              isCashFlow={isCashFlow}
              isIE={isIE}
              isTotals={isTotals}
              isTrends={isTrends}
            />
          </View>
          {isIE && (
            <ChartExtraColumn
              start={start}
              end={end}
              isIE={isIE}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              selectList={selectList}
            />
          )}
        </View>
        <View style={{ marginTop: 30 }}>
          {reportDescriptionTitle}
          {reportDescription}
        </View>
      </View>
    </View>
  );
}

export default AllReports;
