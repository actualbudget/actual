import React, { useState, useEffect, useMemo } from 'react';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { useAccounts } from '../../../hooks/useAccounts';
import { useFilters } from '../../../hooks/useFilters';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { Paragraph } from '../../common/Paragraph';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';
import { NetWorthGraph } from '../graphs/NetWorthGraph';
import { Header } from '../Header';
import { createSpreadsheet as netWorthSpreadsheet } from '../spreadsheets/net-worth-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

export function NetWorth() {
  const accounts = useAccounts();
  const { isNarrowWidth } = useResponsive();
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
    <View
      style={{
        ...styles.page,
        minWidth: isNarrowWidth ? undefined : 650,
        overflow: 'hidden',
      }}
    >
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

        <NetWorthGraph
          style={{ flexGrow: 1 }}
          start={start}
          end={end}
          graphData={data.graphData}
          domain={{
            y: [data.lowestNetWorth * 0.99, data.highestNetWorth * 1.01],
          }}
        />

        <View style={{ marginTop: 30, userSelect: 'none' }}>
          <Paragraph>
            <strong>How is net worth calculated?</strong>
          </Paragraph>
          <Paragraph>
            Net worth shows the balance of all accounts over time, including all
            of your investments. Your “net worth” is considered to be the amount
            you’d have if you sold all your assets and paid off as much debt as
            possible. If you hover over the graph, you can also see the amount
            of assets and debt individually.
          </Paragraph>
        </View>
      </View>
    </View>
  );
}
