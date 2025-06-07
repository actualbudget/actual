import React from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import {
  type balanceTypeOpType,
  type DataEntity,
} from 'loot-core/types/models';

import { ReportOptions } from './ReportOptions';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useFormat } from '@desktop-client/components/spreadsheet/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';

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
  const locale = useLocale();
  const { t } = useTranslation();
  const format = useFormat();

  const net =
    balanceTypeOp === 'netAssets'
      ? 'DEPOSIT'
      : balanceTypeOp === 'netDebts'
        ? 'PAYMENT'
        : Math.abs(data.totalDebts) > Math.abs(data.totalAssets)
          ? 'PAYMENT'
          : 'DEPOSIT';
  const average = data[balanceTypeOp] / intervalsCount;
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
            locale,
          )}
          {monthUtils.format(
            startDate,
            ReportOptions.intervalFormat.get(interval) || '',
            locale,
          ) !==
            monthUtils.format(
              endDate,
              ReportOptions.intervalFormat.get(interval) || '',
              locale,
            ) &&
            ` ${t('to')} ` +
              monthUtils.format(
                endDate,
                ReportOptions.intervalFormat.get(interval) || '',
                locale,
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
          <PrivacyFilter>
            {format(data[balanceTypeOp], 'financial')}
          </PrivacyFilter>
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
            {!isNaN(average) && format(Math.round(average), 'financial')}
          </PrivacyFilter>
        </Text>
        <Text style={{ fontWeight: 600 }}>
          Per {(ReportOptions.intervalMap.get(interval) || '').toLowerCase()}
        </Text>
      </View>
    </View>
  );
}
