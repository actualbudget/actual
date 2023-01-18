import React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';
import { VictoryBar, VictoryGroup, VictoryVoronoiContainer } from 'victory';

import * as actions from 'loot-core/src/client/actions';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { View, Block, AnchorLink } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

import Change from './Change';
import theme from './chart-theme';
import Container from './Container';
import DateRange from './DateRange';
import { simpleCashFlow } from './graphs/cash-flow-spreadsheet';
import netWorthSpreadsheet from './graphs/net-worth-spreadsheet';
import NetWorthGraph from './graphs/NetWorthGraph';
import Tooltip from './Tooltip';
import useReport from './useReport';
import { useArgsMemo } from './util';

function Card({ flex, to, style, children }) {
  const containerProps = { flex, margin: 15 };

  const content = (
    <View
      style={[
        {
          backgroundColor: 'white',
          borderRadius: 2,
          height: 200,
          boxShadow: '0 2px 6px rgba(0, 0, 0, .15)',
          transition: 'box-shadow .25s',
          ':hover': to && {
            boxShadow: '0 4px 6px rgba(0, 0, 0, .15)'
          }
        },
        to ? null : containerProps,
        style
      ]}
    >
      {children}
    </View>
  );

  if (to) {
    return (
      <AnchorLink
        to={to}
        exact
        style={[{ textDecoration: 'none', flex }, containerProps]}
      >
        {content}
      </AnchorLink>
    );
  }
  return content;
}

function NetWorthCard({ accounts }) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, 5);

  const data = useReport(
    'net_worth',
    useArgsMemo(netWorthSpreadsheet)(start, end, accounts)
  );

  if (!data) {
    return null;
  }

  return (
    <Card flex={2} to="/reports/net-worth">
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <Block
              style={[styles.mediumText, { fontWeight: 500, marginBottom: 5 }]}
            >
              Net Worth
            </Block>
            <DateRange start={start} end={end} />
          </View>
          <View style={{ textAlign: 'right' }}>
            <Block
              style={[styles.mediumText, { fontWeight: 500, marginBottom: 5 }]}
            >
              {integerToCurrency(data.netWorth)}
            </Block>
            <Change
              amount={data.totalChange}
              style={{ color: colors.n6, fontWeight: 300 }}
            />
          </View>
        </View>

        <NetWorthGraph
          start={start}
          end={end}
          graphData={data.graphData}
          compact={true}
          style={{ height: 'auto', flex: 1 }}
        />
      </View>
    </Card>
  );
}

function CashFlowCard() {
  const end = monthUtils.currentDay();
  const start = monthUtils.currentMonth() + '-01';

  const data = useReport(
    'cash_flow_simple',
    useArgsMemo(simpleCashFlow)(start, end)
  );
  if (!data) {
    return null;
  }

  const { graphData } = data;
  const expense = -(graphData.expense || 0);
  const income = graphData.income || 0;

  return (
    <Card flex={1} to="/reports/cash-flow">
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <Block
              style={[styles.mediumText, { fontWeight: 500, marginBottom: 5 }]}
            >
              Cash Flow
            </Block>
            <DateRange start={start} end={end} />
          </View>
          <View style={{ textAlign: 'right' }}>
            <Change
              amount={income - expense}
              style={{ color: colors.n6, fontWeight: 300 }}
            />
          </View>
        </View>

        <Container style={{ height: 'auto', flex: 1 }}>
          {(width, height, portalHost) => (
            <VictoryGroup
              colorScale={[theme.colors.blue, theme.colors.red]}
              width={100}
              height={height}
              theme={theme}
              domain={{
                x: [0, 100],
                y: [0, Math.max(income, expense, 100)]
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
                    padding: 0
                  }}
                />
              }
              padding={{
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
              }}
            >
              <VictoryBar
                barWidth={13}
                data={[
                  {
                    x: 30,
                    y: Math.max(income, 5),
                    premadeLabel: (
                      <div style={{ textAlign: 'right' }}>
                        <div>Income</div>
                        <div>{integerToCurrency(income)}</div>
                      </div>
                    ),
                    labelPosition: 'left'
                  }
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
                      <div>
                        <div>Expenses</div>
                        <div>{integerToCurrency(expense)}</div>
                      </div>
                    ),
                    labelPosition: 'right',
                    fill: theme.colors.red
                  }
                ]}
                labels={d => d.premadeLabel}
              />
            </VictoryGroup>
          )}
        </Container>
      </View>
    </Card>
  );
}

function Overview({ accounts }) {
  return (
    <View
      style={[
        styles.page,
        { paddingLeft: 40, paddingRight: 40, minWidth: 700 }
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          flex: '0 0 auto'
        }}
      >
        <NetWorthCard accounts={accounts} />
        <CashFlowCard />
      </View>

      <View
        style={{
          flex: '0 0 auto',
          flexDirection: 'row'
        }}
      >
        <Card
          style={[
            {
              color: '#a0a0a0',
              justifyContent: 'center',
              alignItems: 'center',
              width: 200
            },
            styles.mediumText
          ]}
        >
          More reports
          <br /> coming soon!
        </Card>
      </View>
    </View>
  );
}

export default connect(
  state => ({ accounts: state.queries.accounts }),
  dispatch => bindActionCreators(actions, dispatch)
)(Overview);
