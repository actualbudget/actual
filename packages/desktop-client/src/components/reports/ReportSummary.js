import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';

import { theme, styles } from '../../style';
import Text from '../common/Text';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';

export function ReportSummary({
  start,
  end,
  totalExpenses,
  totalIncome,
  totalNet,
  selectType,
}) {
  let amt =
    selectType === 'Expense'
      ? totalExpenses
      : selectType === 'Income'
      ? totalIncome
      : totalNet;
  let net = totalExpenses > totalIncome ? 'EXPENSE' : 'INCOME';
  return (
    <View
      style={{
        overflow: 'auto',
        flexDirection: 'column',
      }}
    >
      <View
        style={{
          backgroundColor: theme.pageBackground,
          height: 100,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={[
            styles.largeText,
            {
              alignItems: 'center',
              marginBottom: 2,
              fontWeight: 600,
            },
          ]}
        >
          {monthUtils.format(start, 'MMM yyyy')} -{' '}
          {monthUtils.format(end, 'MMM yyyy')}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: theme.pageBackground,
          height: 100,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 10,
        }}
      >
        <Text
          style={[
            styles.mediumText,
            {
              alignItems: 'center',
              marginBottom: 2,
              fontWeight: 400,
            },
          ]}
        >
          {selectType === 'Expense'
            ? 'TOTAL SPENDING'
            : selectType === 'Income'
            ? 'TOTAL INCOME'
            : 'NET ' + net}
        </Text>
        <Text
          style={[
            styles.veryLargeText,
            {
              alignItems: 'center',
              marginBottom: 2,
              fontWeight: 800,
            },
          ]}
        >
          <PrivacyFilter blurIntensity={7}>
            {amountToCurrency(amt)}
          </PrivacyFilter>
        </Text>
        <Text style={{ fontWeight: 600 }}>For this time period</Text>
      </View>
    </View>
  );
}

export function ReportSplit({ data, splitType }) {
  return (
    <View
      style={{
        backgroundColor: theme.pageBackground,
        paddingTop: 10,
        paddingBottom: 10,
        alignItems: 'center',
        marginTop: 10,
      }}
    >
      <Text
        style={[
          styles.largeText,
          {
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 400,
          },
        ]}
      >
        {splitType}
      </Text>
      {data.data.map(item => {
        return <Text key={item.name}>{item.name}</Text>;
      })}
    </View>
  );
}
