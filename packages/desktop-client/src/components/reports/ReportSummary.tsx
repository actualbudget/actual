import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  balanceTypeOpType,
  DataEntity,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

import { getIntervalFormat, ReportOptions } from './ReportOptions';

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
  const dateFormat = useDateFormat();

  const net =
    balanceTypeOp === 'netAssets'
      ? t('DEPOSIT')
      : balanceTypeOp === 'netDebts'
        ? t('PAYMENT')
        : Math.abs(data.totalDebts) > Math.abs(data.totalAssets)
          ? t('PAYMENT')
          : t('DEPOSIT');
  const average = Math.round(data[balanceTypeOp] / intervalsCount);
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
            getIntervalFormat(interval, dateFormat),
            locale,
          )}
          {monthUtils.format(
            startDate,
            getIntervalFormat(interval, dateFormat),
            locale,
          ) !==
            monthUtils.format(
              endDate,
              getIntervalFormat(interval, dateFormat),
              locale,
            ) &&
            ` ${t('to')} ` +
              monthUtils.format(
                endDate,
                getIntervalFormat(interval, dateFormat),
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
            ? t('TOTAL SPENDING')
            : balanceTypeOp === 'totalAssets'
              ? t('TOTAL DEPOSITS')
              : balanceTypeOp === 'totalBudgeted'
                ? t('TOTAL BUDGETED')
                : t('NET {{net}}', { net })}
        </Text>
        <FinancialText
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
        </FinancialText>
        <Text style={{ fontWeight: 600 }}>
          <Trans>For this time period</Trans>
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
            ? t('AVERAGE SPENDING')
            : balanceTypeOp === 'totalAssets'
              ? t('AVERAGE DEPOSIT')
              : balanceTypeOp === 'totalBudgeted'
                ? t('AVERAGE BUDGETED')
                : t('AVERAGE NET')}
        </Text>
        <FinancialText
          style={{
            ...styles.veryLargeText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 800,
          }}
        >
          <PrivacyFilter>
            {!isNaN(average) && format(average, 'financial')}
          </PrivacyFilter>
        </FinancialText>
        <Text style={{ fontWeight: 600 }}>
          <Trans>
            Per{' '}
            {{
              interval: (
                ReportOptions.intervalMap.get(interval) || ''
              ).toLowerCase(),
            }}
          </Trans>
        </Text>
      </View>
    </View>
  );
}
