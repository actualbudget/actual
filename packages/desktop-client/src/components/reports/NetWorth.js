import React, { useState, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';

import * as d from 'date-fns';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useFilters from '../../hooks/useFilters';
import { styles } from '../../style';
import { View, P } from '../common';

import Change from './Change';
import netWorthSpreadsheet from './graphs/net-worth-spreadsheet';
import NetWorthGraph from './graphs/NetWorthGraph';
import Header from './Header';
import useReport from './useReport';
import { fromDateRepr } from './util';

function NetWorth({ accounts }) {
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

  const params = useMemo(
    () => netWorthSpreadsheet(start, end, accounts, filters, conditionsOp),
    [start, end, accounts, filters, conditionsOp],
  );
  const data = useReport('net_worth', params);

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

  if (!allMonths || !data) {
    return null;
  }

  return (
    <View style={[styles.page, { minWidth: 650, overflow: 'hidden' }]}>
      <Header
        title="Net Worth"
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
      />

      <View
        style={{
          backgroundColor: 'white',
          padding: 30,
          paddingTop: 0,
          overflow: 'auto',
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
            style={[styles.largeText, { fontWeight: 400, marginBottom: 5 }]}
          >
            {integerToCurrency(data.netWorth)}
          </View>
          <Change amount={data.totalChange} />
        </View>

        <NetWorthGraph start={start} end={end} graphData={data.graphData} />

        <View style={{ marginTop: 30 }}>
          <P>
            <strong>How is net worth calculated?</strong>
          </P>
          <P>
            Net worth shows the balance of all accounts over time, including all
            of your investments. Your “net worth” is considered to be the amount
            you’d have if you sold all your assets and paid off as much debt as
            possible. If you hover over the graph, you can also see the amount
            of assets and debt individually.
          </P>
        </View>
      </View>
    </View>
  );
}

export default connect(
  state => ({ accounts: state.queries.accounts }),
  dispatch => bindActionCreators(actions, dispatch),
)(NetWorth);
