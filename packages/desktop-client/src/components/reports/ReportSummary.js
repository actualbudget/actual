import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  amountToCurrency,
  integerToCurrency,
  amountToInteger,
} from 'loot-core/src/shared/util';

import { theme, styles } from '../../style';
import Text from '../common/Text';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';

export function ReportSummary({
  start,
  end,
  data,
  balanceTypeOp,
  monthsCount,
}) {
  let net = data.totalDebts > data.totalAssets ? 'EXPENSE' : 'INCOME';
  const average = amountToInteger(data[balanceTypeOp]) / monthsCount;
  return (
    <View
      style={{
        flexDirection: 'column',
        marginBottom: 10,
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
          {balanceTypeOp === 'totalDebts'
            ? 'TOTAL SPENDING'
            : balanceTypeOp === 'totalAssets'
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
            {amountToCurrency(data[balanceTypeOp])}
          </PrivacyFilter>
        </Text>
        <Text style={{ fontWeight: 600 }}>For this time period</Text>
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
          {balanceTypeOp === 'totalDebts'
            ? 'AVERAGE SPENDING'
            : balanceTypeOp === 'totalAssets'
            ? 'AVERAGE INCOME'
            : 'AVERAGE NET'}
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
            {integerToCurrency(Math.round(average))}
          </PrivacyFilter>
        </Text>
        <Text style={{ fontWeight: 600 }}>Per month</Text>
      </View>
    </View>
  );
}

export function ReportLegend({ legend, groupBy }) {
  return (
    <View
      style={{
        backgroundColor: theme.pageBackground,
        alignItems: 'center',
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
        {groupBy}
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
              <View
                style={{
                  marginRight: 5,
                  borderRadius: 1000,
                  width: 14,
                  height: 14,
                  backgroundColor: item.color,
                }}
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
