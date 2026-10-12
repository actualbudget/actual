import React from 'react';
import type { ReactNode } from 'react';
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
import type { TFunction } from 'i18next';

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
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const intervalFormat = getIntervalFormat(interval, dateFormat);

  const net =
    balanceTypeOp === 'netAssets'
      ? t('DEPOSIT')
      : balanceTypeOp === 'netDebts'
        ? t('PAYMENT')
        : Math.abs(data.totalDebts) > Math.abs(data.totalAssets)
          ? t('PAYMENT')
          : t('DEPOSIT');
  const average = Math.round(data[balanceTypeOp] / intervalsCount);
  const perIntervalCaption = (
    <Trans>
      Per{' '}
      {{
        interval: (ReportOptions.intervalMap.get(interval) || '').toLowerCase(),
      }}
    </Trans>
  );

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
          {monthUtils.format(startDate, intervalFormat, locale)}
          {monthUtils.format(startDate, intervalFormat, locale) !==
            monthUtils.format(endDate, intervalFormat, locale) &&
            ` ${t('to')} ` + monthUtils.format(endDate, intervalFormat, locale)}
        </Text>
      </View>
      {data.baseline ? (
        <>
          <SummaryBox
            label={t('BASELINE AVERAGE')}
            value={data.baseline.perInterval?.[balanceTypeOp] ?? 0}
            caption={perIntervalCaption}
          />
          <SummaryBox
            label={getAverageLabel(balanceTypeOp, !!data.baseline.projected, t)}
            value={Math.round(
              (data.baseline.projected ?? data.baseline.actual)[balanceTypeOp] /
                intervalsCount,
            )}
            caption={perIntervalCaption}
          />
          <SummaryBox
            label={
              data.baseline.projected
                ? t('AVERAGE PROJECTED CHANGE')
                : t('AVERAGE CHANGE')
            }
            value={average}
            caption={perIntervalCaption}
          />
        </>
      ) : (
        <>
          <SummaryBox
            label={getTotalLabel(balanceTypeOp, net, t)}
            value={data[balanceTypeOp]}
            caption={<Trans>For this time period</Trans>}
          />
          <SummaryBox
            label={getAverageLabel(balanceTypeOp, false, t)}
            value={average}
            caption={perIntervalCaption}
          />
        </>
      )}
    </View>
  );
}

type SummaryBoxProps = {
  label: string;
  value: number;
  caption: ReactNode;
};

function SummaryBox({ label, value, caption }: SummaryBoxProps) {
  const format = useFormat();

  return (
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
        {label}
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
          {!isNaN(value) && format(value, 'financial')}
        </PrivacyFilter>
      </FinancialText>
      <Text style={{ fontWeight: 600 }}>{caption}</Text>
    </View>
  );
}

function getTotalLabel(
  balanceTypeOp: balanceTypeOpType,
  net: string,
  t: TFunction,
) {
  switch (balanceTypeOp) {
    case 'totalDebts':
      return t('TOTAL SPENDING');
    case 'totalAssets':
      return t('TOTAL DEPOSITS');
    case 'totalBudgeted':
      return t('TOTAL BUDGETED');
    default:
      return t('NET {{net}}', { net });
  }
}

function getAverageLabel(
  balanceTypeOp: balanceTypeOpType,
  isProjected: boolean,
  t: TFunction,
) {
  switch (balanceTypeOp) {
    case 'totalDebts':
      return isProjected
        ? t('AVERAGE PROJECTED SPENDING')
        : t('AVERAGE SPENDING');
    case 'totalAssets':
      return isProjected
        ? t('AVERAGE PROJECTED DEPOSIT')
        : t('AVERAGE DEPOSIT');
    case 'totalBudgeted':
      return t('AVERAGE BUDGETED');
    default:
      return isProjected ? t('AVERAGE PROJECTED NET') : t('AVERAGE NET');
  }
}
