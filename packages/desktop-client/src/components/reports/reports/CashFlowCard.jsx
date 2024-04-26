import React, { useState, useMemo, useCallback } from 'react';

import { Bar, BarChart, LabelList, ResponsiveContainer } from 'recharts';

import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { theme, styles } from '../../../style';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';
import { chartTheme } from '../chart-theme';
import { DateRange } from '../DateRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { simpleCashFlow } from '../spreadsheets/cash-flow-spreadsheet';
import { useReport } from '../useReport';

function CustomLabel({
  value,
  name,
  position,
  x,
  y,
  width: barWidth,
  height: barHeight,
}) {
  const valueLengthOffset = value.toString().length < 5 ? -40 : 20;

  const yOffset = barHeight < 25 ? 105 : y;

  const labelXOffsets = {
    right: 6,
    left: -valueLengthOffset + 1,
  };

  const valueXOffsets = {
    right: 6,
    left: -valueLengthOffset + 2,
  };

  const anchorValue = {
    right: 'start',
    left: 'end',
  };

  return (
    <>
      <text
        x={x + barWidth + labelXOffsets[position]}
        y={yOffset + 10}
        textAnchor={anchorValue[position]}
        fill={theme.tableText}
      >
        {name}
      </text>
      <text
        x={x + barWidth + valueXOffsets[position]}
        y={yOffset + 26}
        textAnchor={anchorValue[position]}
        fill={theme.tableText}
      >
        <PrivacyFilter>{integerToCurrency(value)}</PrivacyFilter>
      </text>
    </>
  );
}

export function CashFlowCard() {
  const end = monthUtils.currentDay();
  const start = monthUtils.currentMonth() + '-01';

  const params = useMemo(() => simpleCashFlow(start, end), [start, end]);
  const data = useReport('cash_flow_simple', params);

  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true));
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false));

  const { graphData } = data || {};
  const expenses = -(graphData?.expense || 0);
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
                <Change amount={income - expenses} />
              </PrivacyFilter>
            </View>
          )}
        </View>

        {data ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  income,
                  expenses,
                },
              ]}
              margin={{
                top: 10,
                bottom: 0,
              }}
            >
              <Bar dataKey="income" fill={chartTheme.colors.blue} barSize={14}>
                <LabelList
                  dataKey="income"
                  position="left"
                  content={<CustomLabel name="Income" />}
                />
              </Bar>
              <Bar dataKey="expenses" fill={chartTheme.colors.red} barSize={14}>
                <LabelList
                  dataKey="expenses"
                  position="right"
                  content={<CustomLabel name="Expenses" />}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
