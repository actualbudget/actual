import { createContext, use, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { effectiveRate } from '@actual-app/core/shared/exchange-rate';
import { format as monthUtilFormat } from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import {
  BudgetCurrencyFormat,
  CurrencyFormatProvider,
} from '#hooks/currencyFormatContext';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useTransactions } from '#hooks/useTransactions';
import { encodingKey } from '#util/account-encoding';
import { formatInCurrency } from '#util/foreign-details';

type Counterpart = {
  account: AccountEntity;
  /** The other leg's amount in its account's encoding. */
  amount: number;
  /** This row's leg, for the rate the two stored amounts imply. */
  ownAccount: AccountEntity;
  ownAmount: number;
  date: string;
};

type Leg = {
  rowId: string;
  legId: string;
  account: string;
  transferId: string;
};

const ExchangeCounterpartsContext = createContext<
  ReadonlyMap<string, Counterpart>
>(new Map());

export const ExchangeCounterpartsProvider =
  ExchangeCounterpartsContext.Provider;

/**
 * The other leg of each visible exchange transfer, keyed by the visible row:
 * a transfer leg, or the split parent holding a fee and the transfer child.
 * Both lookups are live, so labels follow unlinking, deletion and edits.
 */
export function useExchangeCounterparts(
  transactions: ReadonlyArray<
    Pick<TransactionEntity, 'id' | 'account' | 'transfer_id' | 'is_parent'>
  >,
  accounts: ReadonlyArray<AccountEntity>,
): ReadonlyMap<string, Counterpart> {
  // Only budgets with a foreign account can have exchange legs.
  const hasForeign = accounts.some(account => account.currency);
  const parentIds = hasForeign
    ? transactions.filter(t => t.is_parent).map(t => t.id)
    : [];
  const parentKey = parentIds.join(',');
  const childrenQuery = useMemo(
    () =>
      q('transactions')
        .filter({
          parent_id: { $oneof: parentKey ? parentKey.split(',') : [] },
          transfer_id: { $ne: null },
        })
        .select('*')
        .options({ splits: 'all' }),
    [parentKey],
  );
  // Ordinary splits can hold any number of transfer children, so every page
  // is loaded.
  const {
    transactions: children = [],
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useTransactions({
    query: childrenQuery,
    options: { pageSize: Math.max(parentIds.length * 2, 1) },
  });
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const legs: Leg[] = hasForeign
    ? [
        ...transactions
          .filter(t => t.transfer_id && !t.is_parent)
          .map(t => ({
            rowId: t.id,
            legId: t.id,
            account: t.account,
            transferId: t.transfer_id as string,
          })),
        ...children.map(child => ({
          rowId: child.parent_id as string,
          legId: child.id,
          account: child.account,
          transferId: child.transfer_id as string,
        })),
      ]
    : [];
  // Both legs are read as stored: a register may show rows converted.
  const transferKey = legs
    .flatMap(leg => [leg.transferId, leg.legId])
    .join(',');
  const othersQuery = useMemo(
    () =>
      q('transactions')
        .filter({ id: { $oneof: transferKey ? transferKey.split(',') : [] } })
        .select('*')
        .options({ splits: 'all' }),
    [transferKey],
  );
  const { transactions: others = [] } = useTransactions({
    query: othersQuery,
    options: { pageSize: Math.max(legs.length * 2, 1) },
  });

  const othersById = new Map(others.map(other => [other.id, other]));
  const accountsById = new Map(accounts.map(a => [a.id, a]));
  const counterparts = new Map<string, Counterpart>();
  for (const leg of legs) {
    const other = othersById.get(leg.transferId);
    const ownLeg = othersById.get(leg.legId);
    const own = accountsById.get(leg.account);
    const otherAccount = other && accountsById.get(other.account);
    if (
      !other ||
      !ownLeg ||
      other.transfer_id == null ||
      !own ||
      !otherAccount ||
      encodingKey(own) === encodingKey(otherAccount)
    ) {
      continue;
    }
    counterparts.set(leg.rowId, {
      account: otherAccount,
      amount: other.transaction_amount ?? other.amount,
      ownAccount: own,
      ownAmount: ownLeg.transaction_amount ?? ownLeg.amount,
      date: ownLeg.date,
    });
  }
  return counterparts;
}

function CounterpartAmount({ amount }: { amount: number }) {
  const format = useFormat();
  return <>{format(Math.abs(amount), 'financial')}</>;
}

/** The other leg's amount, in its account's currency, after a transfer payee. */
export function ExchangeCounterpartLabel({
  transactionId,
}: {
  transactionId: TransactionEntity['id'];
}) {
  const counterpart = use(ExchangeCounterpartsContext).get(transactionId);
  if (!counterpart) return null;
  const { account, amount } = counterpart;
  const label =
    account.currency && account.currency_precision != null ? (
      <CurrencyFormatProvider
        currencyCode={account.currency}
        precision={account.currency_precision}
      >
        <CounterpartAmount amount={amount} />
      </CurrencyFormatProvider>
    ) : (
      <BudgetCounterpartAmount amount={amount} />
    );
  return (
    <Tooltip
      content={<ExchangeRateDetails counterpart={counterpart} />}
      style={styles.tooltip}
      placement="bottom start"
      triggerProps={{ delay: 300 }}
    >
      <Text
        data-testid="exchange-counterpart"
        style={{
          color: theme.pageTextSubdued,
          marginLeft: 4,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        · {label}
      </Text>
    </Tooltip>
  );
}

/** A rate between two currencies, to six significant digits. */
function shownRate(rate: number) {
  return String(Number(rate.toPrecision(6)));
}

/**
 * The market rate between the two legs' currencies on a date, as this leg's
 * units per one unit of the other leg's currency: undefined while loading,
 * null when either currency has no saved rate.
 */
function useMarketRate(
  ownCurrency: string | null,
  otherCurrency: string | null,
  date: string,
) {
  const [rate, setRate] = useState<number | null>();
  useEffect(() => {
    let cancelled = false;
    // Rates are quote units per base unit; the base itself is 1.
    const perBase = (currency: string | null) =>
      currency
        ? send('exchange-rates/resolve', {
            quoteCurrency: currency,
            date,
          }).then(result =>
            result.status === 'resolved' ? Number(result.rate) : null,
          )
        : Promise.resolve(1);
    void Promise.all([perBase(ownCurrency), perBase(otherCurrency)])
      .then(([own, other]) => (own && other ? own / other : null))
      .catch(() => null)
      .then(result => {
        if (!cancelled) setRate(result);
      });
    return () => {
      cancelled = true;
    };
  }, [ownCurrency, otherCurrency, date]);
  return rate;
}

/**
 * What arrived or left on the other side, the rate this transfer's stored
 * amounts imply, and the saved market rate on its date for comparison.
 */
function ExchangeRateDetails({ counterpart }: { counterpart: Counterpart }) {
  const { t } = useTranslation();
  const budgetPrecision = useAmountPrecision();
  const [defaultCurrency] = useSyncedPref('defaultCurrencyCode');
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { account, amount, ownAccount, ownAmount } = counterpart;
  const codeOf = (a: AccountEntity) => a.currency ?? (defaultCurrency || '');
  const precisionOf = (a: AccountEntity) =>
    a.currency_precision ?? budgetPrecision;
  const own = codeOf(ownAccount);
  const other = codeOf(account);
  const date = monthUtilFormat(counterpart.date, dateFormat);
  const otherAmount = formatInCurrency(
    Math.abs(amount),
    other,
    precisionOf(account),
  );
  const transferRate = effectiveRate(
    ownAmount,
    precisionOf(ownAccount),
    amount,
    precisionOf(account),
  );
  const marketRate = useMarketRate(
    ownAccount.currency,
    account.currency,
    counterpart.date,
  );

  return (
    <View style={{ padding: 10, gap: 2 }} data-testid="exchange-rate-details">
      <Text>
        {amount > 0 ? (
          <Trans>
            {{ amount: otherAmount }} arrived in {{ account: account.name }}
          </Trans>
        ) : (
          <Trans>
            {{ amount: otherAmount }} left {{ account: account.name }}
          </Trans>
        )}
      </Text>
      {transferRate && (
        <Text>
          <Trans>
            Rate of this transfer: 1 {{ other }} = {{ rate: transferRate }}{' '}
            {{ own }}
          </Trans>
        </Text>
      )}
      <Text style={{ color: theme.pageTextSubdued }}>
        {marketRate === undefined
          ? t('Exchange rate on {{date}}: loading…', { date })
          : marketRate === null
            ? t('No exchange rate saved for {{date}}', { date })
            : t('Exchange rate on {{date}}: 1 {{other}} = {{rate}} {{own}}', {
                date,
                other,
                own,
                rate: shownRate(marketRate),
              })}
      </Text>
    </View>
  );
}

function BudgetCounterpartAmount({ amount }: { amount: number }) {
  return (
    <BudgetCurrencyFormat>
      <CounterpartAmount amount={amount} />
    </BudgetCurrencyFormat>
  );
}
