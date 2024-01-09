import React, { useState, useMemo, useCallback } from 'react';

import { VictoryBar, VictoryGroup, VictoryVoronoiContainer } from 'victory';

import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { theme, styles } from '../../../style';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';
import { chartTheme } from '../chart-theme';
import { Container } from '../Container';
import { DateRange } from '../DateRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { simpleCashFlow } from '../spreadsheets/cash-flow-spreadsheet';
import { Tooltip } from '../Tooltip';
import { useReport } from '../useReport';

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
    <ReportCard flex={1} to="/reports/cash-flow">
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
                  style={{ color: theme.tableText, fontWeight: 300 }}
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
    </ReportCard>
  );
}
