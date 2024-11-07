import React from 'react';
import { useTranslation } from 'react-i18next';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  amountToCurrency,
  integerToCurrency,
  amountToInteger,
} from 'loot-core/src/shared/util';
import {
  type balanceTypeOpType,
  type DataEntity,
} from 'loot-core/src/types/models/reports';

import { theme, styles } from '../../style';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';

import { ReportOptions } from './ReportOptions';

type ReportSummaryProps = {
  startDate: string;
  endDate: string;
  data: DataEntity;
  balanceTypeOp: balanceTypeOpType;
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
  const { t } = useTranslation();
  const net =
    balanceTypeOp === 'netAssets'
      ? 'DEPOSIT'
      : balanceTypeOp === 'netDebts'
        ? 'PAYMENT'
        : Math.abs(data.totalDebts) > Math.abs(data.totalAssets)
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
          {monthUtils.format(
            startDate,
            ReportOptions.intervalFormat.get(interval) || '',
          )}
          {monthUtils.format(
            startDate,
            ReportOptions.intervalFormat.get(interval) || '',
          ) !==
            monthUtils.format(
              endDate,
              ReportOptions.intervalFormat.get(interval) || '',
            ) &&
            ' to ' +
              monthUtils.format(
                endDate,
                ReportOptions.intervalFormat.get(interval) || '',
              )}
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
          <PrivacyFilter>{amountToCurrency(data[balanceTypeOp])}</PrivacyFilter>
        </Text>
        <Text style={{ fontWeight: 600 }}>{t('For this time period')}</Text>
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
          <PrivacyFilter>
            {!isNaN(average) && integerToCurrency(Math.round(average))}
          </PrivacyFilter>
        </Text>
        <Text style={{ fontWeight: 600 }}>
          Per {(ReportOptions.intervalMap.get(interval) || '').toLowerCase()}
        </Text>
      </View>
    </View>
  );
}
