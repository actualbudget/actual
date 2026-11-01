import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { Error as ErrorAlert } from '#components/alerts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { FinancialText } from '#components/FinancialText';
import { FormField, FormLabel } from '#components/forms';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

type DeferTransactionModalProps = Extract<
  ModalType,
  { name: 'defer-transaction' }
>['options'];

const MIN_MONTHS = 2;
const MAX_MONTHS = 120;

export function DeferTransactionModal({
  transaction,
}: DeferTransactionModalProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const format = useFormat();
  const dispatch = useDispatch();
  const transactionMonth = monthUtils.monthFromDate(transaction.date);
  const [monthsText, setMonthsText] = useState('12');
  const [startMonth, setStartMonth] = useState(transactionMonth);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const months = Number(monthsText);
  const isValidMonths =
    Number.isInteger(months) && months >= MIN_MONTHS && months <= MAX_MONTHS;

  const monthlyAmount = isValidMonths
    ? format(Math.round(Math.abs(transaction.amount) / months), 'financial')
    : '';

  const startMonthOptions = Array.from({ length: 25 }, (_, index) => {
    const month = monthUtils.addMonths(transactionMonth, index - 12);
    return [month, monthUtils.format(month, 'MMMM yyyy', locale)] as const;
  });

  async function onSubmit(close: () => void) {
    if (isLoading) {
      return;
    }
    if (!isValidMonths) {
      setError(
        t('Enter a number of months between {{min}} and {{max}}.', {
          min: MIN_MONTHS,
          max: MAX_MONTHS,
        }),
      );
      return;
    }

    setIsLoading(true);
    try {
      const { prepaidAccountId } = await send('transaction-defer', {
        id: transaction.id,
        months,
        startMonth,
        prepaidAccountName: t('Prepaid Expenses'),
      });
      // The server remembers the account in a synced pref; mirror it so the
      // context menu knows which account holds the installments
      dispatch(mergeSyncedPrefs({ 'prepaid-account': prepaidAccountId }));
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal name="defer-transaction" containerProps={{ style: { width: 420 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Defer expense')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 10 }}>
            <Paragraph style={{ margin: 0 }}>
              <Trans>
                The payment becomes a transfer to your "Prepaid Expenses"
                account, which is created if it doesn't exist. That account then
                spends it in equal monthly amounts with the original payee and
                category.
              </Trans>
            </Paragraph>

            <FormField>
              <FormLabel
                title={t('Number of months:')}
                htmlFor="defer-months"
              />
              <Input
                id="defer-months"
                type="number"
                min={MIN_MONTHS}
                max={MAX_MONTHS}
                autoFocus
                value={monthsText}
                onChangeValue={value => {
                  setMonthsText(value);
                  setError(null);
                }}
                onEnter={() => void onSubmit(() => state.close())}
              />
            </FormField>

            <FormField>
              <FormLabel title={t('First month:')} htmlFor="defer-start" />
              <Select
                id="defer-start"
                value={startMonth}
                onChange={setStartMonth}
                options={startMonthOptions}
              />
            </FormField>

            {isValidMonths && (
              <Paragraph style={{ margin: 0 }}>
                <Trans>
                  About{' '}
                  <FinancialText>
                    {{ amount: monthlyAmount } as TransObjectLiteral}
                  </FinancialText>{' '}
                  per month
                </Trans>
              </Paragraph>
            )}

            {error && <ErrorAlert>{error}</ErrorAlert>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              isLoading={isLoading}
              isDisabled={isLoading}
              onPress={() => void onSubmit(() => state.close())}
            >
              <Trans>Defer</Trans>
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
