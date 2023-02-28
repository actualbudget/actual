import React, { useState, useEffect } from 'react';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';
import {
  View,
  Text,
  Block,
  P,
  AlignedText,
} from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

import { FilterButton, AppliedFilters } from '../accounts/Filters';

import Change from './Change';
import { cashFlowByDate } from './graphs/cash-flow-spreadsheet';
import CashFlowGraph from './graphs/CashFlowGraph';
import Header from './Header';
import useReport from './useReport';
import { useArgsMemo } from './util';

const sty = {
  SquareShapeView: {
    height: 5,
    backgroundColor: colors.n3,
  },
};

function CashFlow() {
  const [filterz, setFilterz] = useState([]);
  const [filt, setFilt] = useState([]);
  const [displaySpending, setDisplaySpending] = useState('none');
  const [displayCashFlow, setDisplayCashFlow] = useState('inherit');

  const [allMonths, setAllMonths] = useState(null);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 30),
  );
  const [end, setEnd] = useState(monthUtils.currentDay());

  const [isCashFlow, setIsCashFlow] = useState(true);
  const [isConcise, setIsConcise] = useState(() => {
    const numDays = d.differenceInCalendarDays(
      d.parseISO(end),
      d.parseISO(start),
    );
    return numDays > 31 * 3;
  });

  const reportDescription = (() => {
    if (isCashFlow) {
      return (
        <P>
          Cash flow shows the balance of your budgeted accounts over time, and
          the amount of expenses/income each day or month. Your budgeted
          accounts are considered to be &quot;cash on hand&quot;, so this gives
          you a picture of how available money fluctuates.
        </P>
      );
    } else {
      return (
        <P>
          Spending shows your expenses over time and is based on your filters.
          This allows you to look at accounts or payees or categories and track
          money spent in any way you like.
        </P>
      );
    }
  })();

  const reportDescriptionTitle = (() => {
    if (isCashFlow) {
      return (
        <P>
          <strong>How is cash flow calculated?</strong>
        </P>
      );
    } else {
      return (
        <P>
          <strong>How is spending calculated?</strong>
        </P>
      );
    }
  })();

  const data = useReport(
    'cash_flow',
    useArgsMemo(cashFlowByDate)(start, end, isConcise, isCashFlow, filt),
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
    setEnd(endDay);
    setIsConcise(isConcise);
  }

  if (!allMonths || !data) {
    return null;
  }

  const handleMouseHover = e => {
    e.target.style.cursor = 'pointer';
  };

  const { graphData, totalExpenses, totalIncome } = data;

  return (
    <View style={[styles.page, { minWidth: 650, overflow: 'hidden' }]}>
      <View
        style={{
          paddingTop: 0,
          flexShrink: 0,
          flexDirection: 'row',
        }}
      >
        <View
          style={[
            styles.veryLargeText,
            {
              marginLeft: 20,
              flexShrink: 0,
              width: 160,
            },
          ]}
        >
          <View
            onMouseOver={handleMouseHover}
            onClick={() => {
              setDisplaySpending('none');
              setDisplayCashFlow('inherit');
              setIsCashFlow(true);
              deleteAllFilters();
            }}
            style={[
              styles.veryLargeText,
              {
                alignItems: 'center',
                marginBottom: 2,
              },
            ]}
          >
            Cash Flow
          </View>
          <View style={[sty.SquareShapeView, { display: displayCashFlow }]} />
        </View>
        <View
          style={[
            styles.veryLargeText,
            {
              marginLeft: 20,
              flexShrink: 0,
              width: 160,
            },
          ]}
        >
          <View
            onMouseOver={handleMouseHover}
            onClick={() => {
              setDisplaySpending('inherit');
              setDisplayCashFlow('none');
              setIsCashFlow(false);
            }}
            style={[
              styles.veryLargeText,
              {
                alignItems: 'center',
                marginBottom: 2,
              },
            ]}
          >
            Spending
          </View>
          <View style={[sty.SquareShapeView, { display: displaySpending }]} />
        </View>
      </View>

      <Header
        allMonths={allMonths}
        start={monthUtils.getMonth(start)}
        end={monthUtils.getMonth(end)}
        show1Month={true}
        onChangeDates={onChangeDates}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          padding: 20,
          paddingTop: 0,
          display: displaySpending,
        }}
      >
        <View  style={{ marginRight: 10 }}>
          <FilterButton onApply={onApplyFilter} />
        </View>

        {filterz && filterz.length > 0 && (
          <AppliedFilters filters={filterz} onDelete={onDeleteFilter} />
        )}
      </View>
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
            paddingTop: 20,
            paddingRight: 20,
            flexShrink: 0,
            alignItems: 'flex-end',
            color: colors.n3,
          }}
        >
          <AlignedText
            style={{ marginBottom: 5, minWidth: 160 }}
            left={<Block>Income:</Block>}
            right={
              <Text style={{ fontWeight: 600 }}>
                {integerToCurrency(totalIncome)}
              </Text>
            }
          />

          <AlignedText
            style={{ marginBottom: 5, minWidth: 160 }}
            left={<Block>Expenses:</Block>}
            right={
              <Text style={{ fontWeight: 600 }}>
                {integerToCurrency(totalExpenses)}
              </Text>
            }
          />
          <Text style={{ fontWeight: 600 }}>
            <Change amount={totalIncome + totalExpenses} />
          </Text>
        </View>

        <CashFlowGraph
          start={start}
          end={end}
          graphData={graphData}
          isConcise={isConcise}
        />

        <View style={{ marginTop: 30 }}>
          {reportDescriptionTitle}
          {reportDescription}
        </View>
      </View>
    </View>
  );
}

export default CashFlow;
