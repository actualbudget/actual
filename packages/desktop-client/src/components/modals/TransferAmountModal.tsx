import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  convertWithRates,
  getEffectiveRate,
} from '@actual-app/core/shared/fx/convert';
import { findRate } from '@actual-app/core/shared/fx/rates';
import type { RateIndex } from '@actual-app/core/shared/fx/rates';
import * as monthUtils from '@actual-app/core/shared/months';
import {
  amountToInteger,
  currencyToAmount,
  integerToCurrencyWithDecimal,
  MAX_SAFE_NUMBER,
} from '@actual-app/core/shared/util';
import type { IntegerAmount } from '@actual-app/core/shared/util';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { formatPairRate } from '#components/currency/rateFormat';
import { useAccounts } from '#hooks/useAccounts';
import { useCurrencyFormatter } from '#hooks/useCurrencyFormatter';
import { useDateFormat } from '#hooks/useDateFormat';
import { useExchangeRates } from '#hooks/useExchangeRates';
import type { Modal as ModalType } from '#modals/modalsSlice';

type TransferAmountModalProps = Extract<
  ModalType,
  { name: 'transfer-amount' }
>['options'];

// The amount of the other side typed in that account's currency; null while
// it isn't a positive amount safe to add up
function parseAmount(text: string): IntegerAmount | null {
  const amount = currencyToAmount(text.trim());
  if (amount === null || !Number.isFinite(amount)) {
    return null;
  }
  const integer = Math.abs(amountToInteger(amount));
  return integer > 0 && integer <= MAX_SAFE_NUMBER ? integer : null;
}

// The save waiting for this dialog goes on once it is answered: with the
// amount confirmed, or without one when it closes. Only the first answer
// counts, so closing after confirming changes nothing.
export function TransferAmountModal(props: TransferAmountModalProps) {
  const { t } = useTranslation();
  const { rateIndex, isLoading } = useExchangeRates();
  const { onClose } = props;

  // The dialog can also go away without being closed, e.g. when moving to
  // another page; the other side then gets the exchange rate of the day
  // rather than the save waiting forever
  useEffect(() => () => onClose(), [onClose]);

  return (
    <Modal
      name="transfer-amount"
      isLoading={isLoading}
      containerProps={{ style: { maxWidth: 520 } }}
      onClose={onClose}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Currency transfer')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {!isLoading && (
            <TransferAmountForm
              {...props}
              rateIndex={rateIndex}
              onConfirm={amount => {
                props.onConfirm(amount);
                state.close();
              }}
            />
          )}
        </>
      )}
    </Modal>
  );
}

function TransferAmountForm({
  accountId,
  transferAccountId,
  amount,
  date,
  rateIndex,
  onConfirm,
}: Omit<TransferAmountModalProps, 'onClose'> & { rateIndex: RateIndex }) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { data: accounts = [] } = useAccounts();
  const { getAccountCurrency, formatAmount } = useCurrencyFormatter();

  const account = accounts.find(({ id }) => id === accountId);
  const transferAccount = accounts.find(({ id }) => id === transferAccountId);
  const currency = account ? getAccountCurrency(account) : '';
  const transferCurrency = transferAccount
    ? getAccountCurrency(transferAccount)
    : '';

  const marketRate = findRate(rateIndex, currency, transferCurrency, date);
  const suggestedAmount = Math.abs(
    convertWithRates(amount, currency, transferCurrency, rateIndex, date)
      .amount,
  );
  const suggestedText = integerToCurrencyWithDecimal(
    suggestedAmount,
    transferCurrency,
  );
  const [text, setText] = useState(suggestedText);
  const enteredAmount = parseAmount(text);

  const isLeaving = amount < 0;
  const formattedAmount = formatAmount(Math.abs(amount), currency);
  const formattedDate = monthUtils.format(date, dateFormat);
  const accountName = account?.name ?? '';
  const transferAccountName = transferAccount?.name ?? '';

  // Both rates read the same way, e.g. "1 USD = … CAD"; without an
  // exchange rate the rate of this transfer picks its own way
  const inverted = marketRate ? marketRate.rate < 1 : undefined;
  const effectiveRate =
    enteredAmount !== null ? getEffectiveRate(amount, enteredAmount) : null;

  // What the transfer cost compared to the exchange rate of the day, in
  // the currency of this account: what left was worth more than what
  // arrived
  const otherValue =
    enteredAmount !== null
      ? convertWithRates(
          enteredAmount,
          transferCurrency,
          currency,
          rateIndex,
          date,
        ).amount
      : null;
  const cost =
    otherValue === null
      ? null
      : isLeaving
        ? Math.abs(amount) - otherValue
        : otherValue - Math.abs(amount);

  const submit = () => {
    if (enteredAmount !== null) {
      onConfirm(enteredAmount);
    }
  };

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
    >
      <View style={{ gap: 12, lineHeight: 1.5 }}>
        <Text>
          {isLeaving ? (
            <Trans>
              {{ amount: formattedAmount }} leaves {{ account: accountName }} on{' '}
              {{ date: formattedDate }}. How much arrived in{' '}
              {{ transferAccount: transferAccountName }}?
            </Trans>
          ) : (
            <Trans>
              {{ amount: formattedAmount }} arrives in{' '}
              {{ account: accountName }} on {{ date: formattedDate }}. How much
              left {{ transferAccount: transferAccountName }}?
            </Trans>
          )}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <InitialFocus>
            <Input
              aria-label={t('Amount in {{currency}}', {
                currency: transferCurrency,
              })}
              value={text}
              inputMode="decimal"
              style={{ flex: 1 }}
              onChangeValue={setText}
              onFocus={event => event.currentTarget.select()}
            />
          </InitialFocus>
          <Text style={{ fontWeight: 600 }}>{transferCurrency}</Text>
        </View>

        <View style={{ color: theme.pageTextLight, fontSize: 13 }}>
          {effectiveRate !== null && (
            <Text>
              <Trans>
                Rate of this transfer:{' '}
                {{
                  rate: formatPairRate(
                    effectiveRate,
                    currency,
                    transferCurrency,
                    inverted,
                  ),
                }}
              </Trans>
            </Text>
          )}
          {marketRate ? (
            <Text>
              <Trans>
                Exchange rate on {{ date: formattedDate }}:{' '}
                {{
                  rate:
                    (marketRate.isFallback ? '≈' : '') +
                    formatPairRate(
                      marketRate.rate,
                      currency,
                      transferCurrency,
                      inverted,
                    ),
                }}
              </Trans>
            </Text>
          ) : (
            <Text>
              <Trans>
                No exchange rate between {{ currency }} and{' '}
                {{ transferCurrency }} yet, so the suggested amount counts 1:1.
              </Trans>
            </Text>
          )}
          {marketRate && cost !== null && (
            <Text>
              <Trans>
                Fees and spread at that rate:{' '}
                {{ cost: formatAmount(cost, currency) }}
              </Trans>
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <Button
            isDisabled={text === suggestedText}
            onPress={() => setText(suggestedText)}
          >
            <Trans>Use the exchange rate</Trans>
          </Button>
          <Button
            type="submit"
            variant="primary"
            isDisabled={enteredAmount === null}
          >
            <Trans>Save</Trans>
          </Button>
        </View>
      </View>
    </form>
  );
}
