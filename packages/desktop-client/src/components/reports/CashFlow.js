import React, { useCallback, useState, useEffect, useMemo } from 'react';

import * as d from 'date-fns';
import { VictoryBar, VictoryGroup, VictoryVoronoiContainer } from 'victory';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useFilters from '../../hooks/useFilters';
import { theme, styles } from '../../style';
import AlignedText from '../common/AlignedText';
import Block from '../common/Block';
import Paragraph from '../common/Paragraph';
import Text from '../common/Text';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';

import { chartTheme } from './chart-theme';
import CashFlowGraph from './graphs/CashFlowGraph';
import Header from './Header';
import {
  cashFlowByDate,
  simpleCashFlow,
} from './spreadsheets/cash-flow-spreadsheet';
import { Container } from './Tools';
import {
  Card,
  Change,
  DateRange,
  LoadingIndicator,
  Tooltip,
  useReport,
} from './util';

export function CashFlowCard() {
  const end = monthUtils.currentDay();
  const start = monthUtils.currentMonth() + '-01';

  const params = useMemo(() => simpleCashFlow(start, end), [start, end]);
  const data = useReport('cash_flow_simple', params);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true));
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false));

  const { graphData } = data || {};
  const expense = -(graphData?.expense || 0);
  const income = graphData?.income || 0;

  return (
    <Card flex={1} to="/reports/cash-flow">
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
              Cash Flow
            </Block>
            <DateRange start={start} end={end} />
          </View>
          {data && (
            <View style={{ textAlign: 'right' }}>
              <PrivacyFilter activationFilters={[!isCardHovered]}>
                <Change
                  amount={income - expense}
                  style={{ color: theme.altTableText, fontWeight: 300 }}
                />
              </PrivacyFilter>
            </View>
          )}
        </View>

        {data ? (
          <Container style={{ height: 'auto', flex: 1 }}>
            {(width, height, portalHost) => (
              <VictoryGroup
                colorScale={[chartTheme.colors.blue, chartTheme.colors.red]}
                width={100}
                height={height}
                theme={chartTheme}
                domain={{
                  x: [0, 100],
                  y: [0, Math.max(income, expense, 100)],
                }}
                containerComponent={
                  <VictoryVoronoiContainer voronoiDimension="x" />
                }
                labelComponent={
                  <Tooltip
                    portalHost={portalHost}
                    offsetX={(width - 100) / 2}
                    offsetY={y => (y + 40 > height ? height - 40 : y)}
                    light={true}
                    forceActive={true}
                    style={{
                      padding: 0,
                    }}
                  />
                }
                padding={{
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                }}
              >
                <VictoryBar
                  barWidth={13}
                  data={[
                    {
                      x: 30,
                      y: Math.max(income, 5),
                      premadeLabel: (
                        <View style={{ textAlign: 'right' }}>
                          Income
                          <View>
                            <PrivacyFilter activationFilters={[!isCardHovered]}>
                              {integerToCurrency(income)}
                            </PrivacyFilter>
                          </View>
                        </View>
                      ),
                      labelPosition: 'left',
                    },
                  ]}
                  labels={d => d.premadeLabel}
                />
                <VictoryBar
                  barWidth={13}
                  data={[
                    {
                      x: 60,
                      y: Math.max(expense, 5),
                      premadeLabel: (
                        <View>
                          Expenses
                          <View>
                            <PrivacyFilter activationFilters={[!isCardHovered]}>
                              {integerToCurrency(expense)}
                            </PrivacyFilter>
                          </View>
                        </View>
                      ),
                      labelPosition: 'right',
                    },
                  ]}
                  labels={d => d.premadeLabel}
                />
              </VictoryGroup>
            )}
          </Container>
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </Card>
  );
}

function CashFlow() {
  const {
    filters,
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
  const [end, setEnd] = useState(monthUtils.currentDay());

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

  const { graphData, totalExpenses, totalIncome, totalTransfers } = data;

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
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
      />

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
          start={start}
          end={end}
          graphData={graphData}
          isConcise={isConcise}
        />

        <View style={{ marginTop: 30 }}>
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

export default CashFlow;
