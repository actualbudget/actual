import React, { useState, useEffect, useMemo } from 'react';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type RuleConditionEntity } from 'loot-core/types/models';

import { useFilters } from '../../../hooks/useFilters';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Button } from '../../common/Button';
import { Paragraph } from '../../common/Paragraph';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';
import { CashFlowGraph } from '../graphs/CashFlowGraph';
import { Header } from '../Header';
import { cashFlowByDate } from '../spreadsheets/cash-flow-spreadsheet';
import { useReport } from '../useReport';

export function CashFlow() {
  const { isNarrowWidth } = useResponsive();
  const {
    filters,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onCondOpChange,
  } = useFilters<RuleConditionEntity>();

  const [allMonths, setAllMonths] = useState<null | Array<{
    name: string;
    pretty: string;
  }>>(null);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 5),
  );
  const [end, setEnd] = useState(monthUtils.currentDay());
  const [showBalance, setShowBalance] = useState(true);

  const [isConcise, setIsConcise] = useState(() => {
    const numDays = d.differenceInCalendarDays(
      d.parseISO(end),
      d.parseISO(start),
    );
    return numDays > 31 * 3;
  });

  const params = useMemo(
    () => cashFlowByDate(start, end, isConcise, filters, conditionsOp),
    [start, end, isConcise, filters, conditionsOp],
  );
  const data = useReport('cash_flow', params);

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

  function onChangeDates(start: string, end: string) {
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

  const { graphData, totalExpenses, totalIncome, totalTransfers } = data;

  return (
    <View
      style={{
        ...styles.page,
        minWidth: isNarrowWidth ? undefined : 650,
        overflow: 'hidden',
      }}
    >
      <Header
        title="Cash Flow"
        allMonths={allMonths}
        start={monthUtils.getMonth(start)}
        end={monthUtils.getMonth(end)}
        show1Month
        onChangeDates={onChangeDates}
        onApply={onApplyFilter}
        filters={filters}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onCondOpChange={onCondOpChange}
        headerPrefixItems={undefined}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <Button onClick={() => setShowBalance(state => !state)}>
            {showBalance ? 'Hide balance' : 'Show balance'}
          </Button>
        </View>
      </Header>
      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 30,
          paddingTop: 0,
          overflow: 'auto',
        }}
      >
        <View
          style={{
            paddingTop: 20,
            paddingRight: 20,
            flexShrink: 0,
            alignItems: 'flex-end',
            color: theme.pageText,
          }}
        >
          <AlignedText
            style={{ marginBottom: 5, minWidth: 160 }}
            left={<Block>Income:</Block>}
            right={
              <Text style={{ fontWeight: 600 }}>
                <PrivacyFilter>{integerToCurrency(totalIncome)}</PrivacyFilter>
              </Text>
            }
          />

          <AlignedText
            style={{ marginBottom: 5, minWidth: 160 }}
            left={<Block>Expenses:</Block>}
            right={
              <Text style={{ fontWeight: 600 }}>
                <PrivacyFilter>
                  {integerToCurrency(totalExpenses)}
                </PrivacyFilter>
              </Text>
            }
          />

          <AlignedText
            style={{ marginBottom: 5, minWidth: 160 }}
            left={<Block>Transfers:</Block>}
            right={
              <Text style={{ fontWeight: 600 }}>
                <PrivacyFilter>
                  {integerToCurrency(totalTransfers)}
                </PrivacyFilter>
              </Text>
            }
          />
          <Text style={{ fontWeight: 600 }}>
            <PrivacyFilter>
              <Change amount={totalIncome + totalExpenses + totalTransfers} />
            </PrivacyFilter>
          </Text>
        </View>

        <CashFlowGraph
          graphData={graphData}
          isConcise={isConcise}
          showBalance={showBalance}
        />

        <View style={{ marginTop: 30, userSelect: 'none' }}>
          <Paragraph>
            <strong>How is cash flow calculated?</strong>
          </Paragraph>
          <Paragraph>
            Cash flow shows the balance of your budgeted accounts over time, and
            the amount of expenses/income each day or month. Your budgeted
            accounts are considered to be “cash on hand,” so this gives you a
            picture of how available money fluctuates.
          </Paragraph>
        </View>
      </View>
    </View>
  );
}
