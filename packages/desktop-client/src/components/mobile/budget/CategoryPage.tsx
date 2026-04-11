import React, { Fragment, useMemo } from 'react';
import { Trans } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';

import { TextOneLine } from '@actual-app/components/text-one-line';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import {
  getPayPeriodLabel,
  isPayPeriod,
} from '@actual-app/core/shared/pay-periods';

import { PayPeriodProvider } from '#components/budget/PayPeriodContext';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { AddTransactionButton } from '#components/mobile/transactions/AddTransactionButton';
import { MobilePageHeader, Page } from '#components/Page';
import { useCategory } from '#hooks/useCategory';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useLocale } from '#hooks/useLocale';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { CategoryTransactions } from './CategoryTransactions';
import { UncategorizedTransactions } from './UncategorizedTransactions';

export function CategoryPage() {
  const locale = useLocale();
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const isPayPeriodsEnabled = useFeatureFlag('payPeriodsEnabled');
  const [showPayPeriods] = useSyncedPref('showPayPeriods');
  const [payPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate] = useSyncedPref('payPeriodStartDate');
  const payPeriodConfig = useMemo(
    () => ({
      enabled: isPayPeriodsEnabled && showPayPeriods === 'true',
      payFrequency:
        (payPeriodFrequency as 'weekly' | 'biweekly' | 'monthly') ?? 'monthly',
      startDate: payPeriodStartDate ?? '',
    }),
    [
      isPayPeriodsEnabled,
      showPayPeriods,
      payPeriodFrequency,
      payPeriodStartDate,
    ],
  );

  const { id: categoryIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const month =
    searchParams.get('month') || monthUtils.currentMonth(payPeriodConfig);
  const { data: category } = useCategory(categoryIdParam);

  const periodLabel =
    isPayPeriod(month) && payPeriodConfig.enabled
      ? getPayPeriodLabel(month, payPeriodConfig, 'short', locale)
      : monthUtils.format(month, "MMMM ''yy", locale);

  return (
    <PayPeriodProvider
      config={payPeriodConfig.enabled ? payPeriodConfig : undefined}
    >
      <Page
        header={
          <MobilePageHeader
            title={
              category ? (
                <View>
                  <TextOneLine>{category.name}</TextOneLine>
                  <TextOneLine>({periodLabel})</TextOneLine>
                </View>
              ) : (
                <TextOneLine>
                  <Trans>Uncategorized</Trans>
                </TextOneLine>
              )
            }
            leftContent={<MobileBackButton />}
            rightContent={<AddTransactionButton categoryId={category?.id} />}
          />
        }
        padding={0}
      >
        {/* This key forces the whole table rerender when the number format changes */}
        <Fragment key={numberFormat + hideFraction}>
          {category ? (
            <CategoryTransactions category={category} month={month} />
          ) : (
            <UncategorizedTransactions />
          )}
        </Fragment>
      </Page>
    </PayPeriodProvider>
  );
}
