import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';

import YinYang from '../../icons/v1/YinYang';
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
        flexDirection: 'column',
      }}
    >
      <View
        style={{
          backgroundColor: theme.pageBackground,
          padding: 15,
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
          padding: 15,
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

export function ReportSplit({ data, legend, splitType }) {
  return (
    <View
      style={{
        backgroundColor: theme.pageBackground,
        alignItems: 'center',
        marginTop: 10,
        flex: 1,
        overflowY: 'auto',
      }}
    >
      <Text
        style={[
          styles.largeText,
          {
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 400,
            paddingTop: 10,
          },
        ]}
      >
        {splitType}
      </Text>
      <View>
        {legend.map(item => {
          return (
            <View
              key={item.name}
              style={{
                padding: 10,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <YinYang
                style={{ marginRight: 5, color: item.color }}
                width={14}
                height={14}
              />
              <Text
                style={{
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                }}
              >
                {item.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
