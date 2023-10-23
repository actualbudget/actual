import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useFilters from '../../hooks/useFilters';
import { theme, styles } from '../../style';
import Block from '../common/Block';
import Paragraph from '../common/Paragraph';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';

import NetWorthGraph from './graphs/NetWorthGraph';
import Header from './Header';
import netWorthSpreadsheet from './spreadsheets/net-worth-spreadsheet';
import {
  Card,
  Change,
  DateRange,
  fromDateRepr,
  LoadingIndicator,
  useReport,
} from './util';

export function NetWorthCard({ accounts }) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, 5);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true));
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false));

  const params = useMemo(
    () => netWorthSpreadsheet(start, end, accounts),
    [start, end, accounts],
  );
  const data = useReport('net_worth', params);

  return (
    <Card flex={2} to="/reports/net-worth">
      <View
        style={{ flex: 1 }}
        onPointerEnter={onCardHover}
        onPointerLeave={onCardHoverEnd}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <Block
              style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
              role="heading"
            >
              Net Worth
            </Block>
            <DateRange start={start} end={end} />
          </View>
          {data && (
            <View style={{ textAlign: 'right' }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {integerToCurrency(data.netWorth)}
                </PrivacyFilter>
              </Block>
              <PrivacyFilter activationFilters={[!isCardHovered]}>
                <Change
                  amount={data.totalChange}
                  style={{ color: theme.altTableText, fontWeight: 300 }}
                />
              </PrivacyFilter>
            </View>
          )}
        </View>

        {data ? (
          <NetWorthGraph
            start={start}
            end={end}
            graphData={data.graphData}
            compact={true}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </Card>
  );
}

export default function NetWorth() {
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
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
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

        <View style={{ marginTop: 30 }}>
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
