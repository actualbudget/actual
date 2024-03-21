// @ts-strict-ignore
import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  amountToCurrency,
  integerToCurrency,
  amountToInteger,
} from 'loot-core/src/shared/util';
import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { theme, styles } from '../../style';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';

type ReportSummaryProps = {
  startDate: string;
  endDate: string;
  data: GroupedEntity;
  balanceTypeOp: string;
  interval: string;
  intervalsCount: number;
};

export function ReportSummary({
  startDate,
  endDate,
  data,
  balanceTypeOp,
  interval,
  intervalsCount,
}: ReportSummaryProps) {
  const net =
    Math.abs(data.totalDebts) > Math.abs(data.totalAssets)
      ? 'PAYMENT'
      : 'DEPOSIT';
  const average = amountToInteger(data[balanceTypeOp]) / intervalsCount;
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
          style={{
            ...styles.largeText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 600,
          }}
        >
          {monthUtils.format(startDate, 'MMM yyyy')} -{' '}
          {monthUtils.format(endDate, 'MMM yyyy')}
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
          style={{
            ...styles.mediumText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 400,
          }}
        >
          {balanceTypeOp === 'totalDebts'
            ? 'TOTAL SPENDING'
            : balanceTypeOp === 'totalAssets'
              ? 'TOTAL DEPOSITS'
              : 'NET ' + net}
        </Text>
        <Text
          style={{
            ...styles.veryLargeText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 800,
          }}
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
          style={{
            ...styles.mediumText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 400,
          }}
        >
          {balanceTypeOp === 'totalDebts'
            ? 'AVERAGE SPENDING'
            : balanceTypeOp === 'totalAssets'
              ? 'AVERAGE DEPOSIT'
              : 'AVERAGE NET'}
        </Text>
        <Text
          style={{
            ...styles.veryLargeText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 800,
          }}
        >
          <PrivacyFilter blurIntensity={7}>
            {!isNaN(average) && integerToCurrency(Math.round(average))}
          </PrivacyFilter>
        </Text>
        <Text style={{ fontWeight: 600 }}>
          Per {interval === 'Monthly' ? 'month' : 'year'}
        </Text>
      </View>
    </View>
  );
}
