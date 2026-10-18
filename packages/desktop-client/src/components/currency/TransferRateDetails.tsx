import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { getEffectiveRate } from '@actual-app/core/shared/fx/convert';
import { findRate } from '@actual-app/core/shared/fx/rates';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { useCurrencyFormatter } from '#hooks/useCurrencyFormatter';
import { useDateFormat } from '#hooks/useDateFormat';
import { useExchangeRates } from '#hooks/useExchangeRates';
import { useQuery } from '#hooks/useQuery';

import { formatPairRate } from './rateFormat';

type TransferRateDetailsProps = {
  transaction: Pick<
    TransactionEntity,
    'amount' | 'date' | 'transfer_id' | 'account'
  >;
  account: Pick<AccountEntity, 'id' | 'currency'>;
  transferAccount: Pick<AccountEntity, 'id' | 'name' | 'currency'>;
};

// What a transfer between currencies amounted to: the other side's own
// amount, the rate the two sides imply (fees and spread included) and the
// exchange rate of the day. Read only while shown, e.g. in a tooltip, and
// kept up to date as the other side changes.
export function TransferRateDetails({
  transaction,
  account,
  transferAccount,
}: TransferRateDetailsProps) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { getAccountCurrency, formatAmount } = useCurrencyFormatter();
  const { rateIndex } = useExchangeRates();

  const transferId = transaction.transfer_id;
  const { data: otherSide } = useQuery<Pick<TransactionEntity, 'amount'>>(
    () =>
      transferId
        ? q('transactions')
            .filter({ id: transferId })
            .options({ splits: 'all' })
            .select(['amount'])
        : null,
    [transferId],
  );
  const otherAmount = otherSide?.[0]?.amount ?? null;

  const currency = getAccountCurrency(account);
  const transferCurrency = getAccountCurrency(transferAccount);
  const marketRate = findRate(
    rateIndex,
    currency,
    transferCurrency,
    transaction.date,
  );
  // Both rates read the same way, e.g. "1 USD = … CAD"; without an
  // exchange rate the rate of this transfer picks its own way
  const inverted = marketRate ? marketRate.rate < 1 : undefined;
  const effectiveRate =
    otherAmount !== null
      ? getEffectiveRate(transaction.amount, otherAmount)
      : null;
  const formattedDate = monthUtils.format(transaction.date, dateFormat);
  const formattedOtherAmount =
    otherAmount !== null
      ? formatAmount(Math.abs(otherAmount), transferCurrency)
      : '';

  return (
    <View style={{ gap: 4, maxWidth: 320 }}>
      {otherAmount !== null && otherAmount > 0 && (
        <Text>
          <Trans>
            {{ amount: formattedOtherAmount }} arrived in{' '}
            {{ account: transferAccount.name }}
          </Trans>
        </Text>
      )}
      {otherAmount !== null && otherAmount < 0 && (
        <Text>
          <Trans>
            {{ amount: formattedOtherAmount }} left{' '}
            {{ account: transferAccount.name }}
          </Trans>
        </Text>
      )}
      {effectiveRate !== null && effectiveRate > 0 && (
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
            No exchange rate between {{ currency }} and {{ transferCurrency }}{' '}
            yet.
          </Trans>
        </Text>
      )}
    </View>
  );
}
