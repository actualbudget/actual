import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { VictoryBar, VictoryGroup, VictoryVoronoiContainer } from 'victory';

import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useCategories from '../../hooks/useCategories';
import useFeatureFlag from '../../hooks/useFeatureFlag';
import AnimatedLoading from '../../icons/AnimatedLoading';
import { theme, styles } from '../../style';
import AnchorLink from '../common/AnchorLink';
import Block from '../common/Block';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';

import Change from './Change';
import { chartTheme } from './chart-theme';
import Container from './Container';
import DateRange from './DateRange';
import { simpleCashFlow } from './graphs/cash-flow-spreadsheet';
import categorySpendingSpreadsheet from './graphs/category-spending-spreadsheet';
import CategorySpendingGraph from './graphs/CategorySpendingGraph';
import netWorthSpreadsheet from './graphs/net-worth-spreadsheet';
import NetWorthGraph from './graphs/NetWorthGraph';
import sankeySpreadsheet from './graphs/sankey-spreadsheet';
import SankeyGraph from './graphs/SankeyGraph';
import Tooltip from './Tooltip';
import useReport from './useReport';

function Card({ flex, to, style, children }) {
  const containerProps = { flex, margin: 15 };

  const content = (
    <View
      style={{
        backgroundColor: theme.tableBackground,
        borderRadius: 2,
        height: 200,
        boxShadow: '0 2px 6px rgba(0, 0, 0, .15)',
        transition: 'box-shadow .25s',
        ':hover': to && {
          boxShadow: '0 4px 6px rgba(0, 0, 0, .15)',
        },
        ...(to ? null : containerProps),
        ...style,
      }}
    >
      {children}
    </View>
  );

  if (to) {
    return (
      <AnchorLink
        to={to}
        style={{ textDecoration: 'none', flex, ...containerProps }}
      >
        {content}
      </AnchorLink>
    );
  }
  return content;
}

function LoadingIndicator() {
  return (
    <View
      style={{
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatedLoading style={{ width: 25, height: 25 }} />
    </View>
  );
}

function NetWorthCard({ accounts }) {
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

function CashFlowCard() {
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

function CategorySpendingCard() {
  const { list: categories = [] } = useCategories();

  const end = monthUtils.currentDay();
  const start = monthUtils.subMonths(end, 3);

  const params = useMemo(() => {
    return categorySpendingSpreadsheet(
      start,
      end,
      3,
      categories.filter(category => !category.is_income && !category.hidden),
    );
  }, [start, end, categories]);

  const perCategorySpending = useReport('category_spending', params);

  return (
    <Card flex={1} to="/reports/category-spending">
      <View>
        <View style={{ flexDirection: 'row', padding: '20px 20px 0' }}>
          <View style={{ flex: 1 }}>
            <Block
              style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
              role="heading"
            >
              Spending
            </Block>
            <DateRange start={start} end={end} />
          </View>
        </View>
      </View>

      {perCategorySpending ? (
        <CategorySpendingGraph
          start={start}
          end={end}
          graphData={perCategorySpending}
          compact={true}
        />
      ) : (
        <LoadingIndicator />
      )}
    </Card>
  );
}

function SankeyCard({ categories }) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, 5);

  const params = useMemo(
    () => sankeySpreadsheet(start, end, categories),
    [start, end, categories],
  );
  const data = useReport('sankey', params);

  return (
    <Card flex={2} to="/reports/sankey">
      <View>
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <Block
              style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
              role="heading"
            >
              Sankey
            </Block>
            <DateRange start={start} end={end} />
          </View>
        </View>
      </View>

      {data ? (
        <SankeyGraph data={data} /> // passing in correct data doesn't format correctly
      ) : (
        <LoadingIndicator />
      )}
    </Card>
  );
}

export default function Overview() {
  let categorySpendingReportFeatureFlag = useFeatureFlag(
    'categorySpendingReport',
  );
  let sankeyFeatureFlag = useFeatureFlag('sankeyReport');

  let accounts = useSelector(state => state.queries.accounts);
  let categories = useSelector(state => state.queries.categories.grouped);
  return (
    <View
      style={{
        ...styles.page,
        ...{ paddingLeft: 40, paddingRight: 40, minWidth: 700 },
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flex: '0 0 auto',
        }}
      >
        <NetWorthCard accounts={accounts} />
        <CashFlowCard />
      </View>

      {sankeyFeatureFlag && (
        <View
          style={{
            flex: '0 0 auto',
            flexDirection: 'row',
          }}
        >
          <SankeyCard categories={categories} />
          <div style={{ flex: 1 }} />
          <div style={{ flex: 1 }} />
        </View>
      )}
      {categorySpendingReportFeatureFlag && (
        <View
          style={{
            flex: '0 0 auto',
            flexDirection: 'row',
          }}
        >
          <CategorySpendingCard />
          <div style={{ flex: 1 }} />
          <div style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}
