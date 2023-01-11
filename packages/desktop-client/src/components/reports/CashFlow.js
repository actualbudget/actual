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
  AlignedText
} from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

import Change from './Change';
import { cashFlowByDate } from './graphs/cash-flow-spreadsheet';
import CashFlowGraph from './graphs/CashFlowGraph';
import Header from './Header';
import useReport from './useReport';
import { useArgsMemo } from './util';

function CashFlow() {
  const [allMonths, setAllMonths] = useState(null);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 30)
  );
  const [end, setEnd] = useState(monthUtils.currentDay());

  const [isConcise, setIsConcise] = useState(() => {
    const numDays = d.differenceInCalendarDays(
      d.parseISO(end),
      d.parseISO(start)
    );
    return numDays > 31 * 3;
  });

  const data = useReport(
    'cash_flow',
    useArgsMemo(cashFlowByDate)(start, end, isConcise)
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
          pretty: monthUtils.format(month, 'MMMM, yyyy')
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    run();
  }, []);

  function onChangeDates(start, end) {
    const numDays = d.differenceInCalendarDays(
      d.parseISO(end),
      d.parseISO(start)
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

  const { graphData, totalExpenses, totalIncome } = data;

  return (
    <View style={[styles.page, { minWidth: 650, overflow: 'hidden' }]}>
      <Header
        title="Cash Flow"
        allMonths={allMonths}
        start={monthUtils.getMonth(start)}
        end={monthUtils.getMonth(end)}
        show1Month={true}
        onChangeDates={onChangeDates}
      />
      <View
        style={{
          backgroundColor: 'white',
          paddingLeft: 30,
          paddingRight: 30,
          overflow: 'auto'
        }}
      >
        <View
          style={{
            paddingTop: 20,
            paddingRight: 20,
            flexShrink: 0,
            alignItems: 'flex-end',
            color: colors.n3
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
          <P>
            <strong>How is cash flow calculated?</strong>
          </P>
          <P>
            Cash flow shows the balance of your budgeted accounts over time, and
            the amount of expenses/income each day or month. Your budgeted
            accounts are considered to be "cash on hand", so this gives you a
            picture of how available money fluctuates.
          </P>
        </View>
      </View>
    </View>
  );
}

export default CashFlow;
