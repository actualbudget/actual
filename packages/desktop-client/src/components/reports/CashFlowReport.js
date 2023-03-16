import React from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';
import {
  View,
  Text,
  Block,
  AlignedText,
  P,
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import Change from './Change';
import BarLineGraph from './graphs/BarLineGraph';

function CashFlowReport({
  start,
  end,
  totalIncome,
  totalExpenses,
  graphData,
  isConcise,
}) {
  return (
    <View
      style={{
        backgroundColor: 'white',
        paddingLeft: 30,
        paddingRight: 30,
        overflow: 'auto',
      }}
    >
      <View
        style={{
          flexShrink: 0,
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingTop: 0,
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            overflow: 'auto',
            flexGrow: 1,
            padding: 10,
          }}
        >
          <View
            style={{
              paddingTop: 20,
              paddingRight: 20,
              flexShrink: 0,
              alignItems: 'flex-end',
              color: colors.n3,
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
          <BarLineGraph
            start={start}
            end={end}
            graphData={graphData}
            isConcise={isConcise}
          />
        </View>
      </View>
      <View style={{ maxWidth: 800, marginTop: 10 }}>
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
  );
}

export default CashFlowReport;
