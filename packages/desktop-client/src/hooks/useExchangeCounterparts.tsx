import { createContext, use, useEffect, useMemo } from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { q } from '@actual-app/core/shared/query';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import {
  BudgetCurrencyFormat,
  CurrencyFormatProvider,
} from '#hooks/currencyFormatContext';
import { useFormat } from '#hooks/useFormat';
import { useTransactions } from '#hooks/useTransactions';
import { encodingKey } from '#util/account-encoding';

type Counterpart = {
  account: AccountEntity;
  /** The other leg's amount in its account's encoding. */
  amount: number;
};

type Leg = { rowId: string; account: string; transferId: string };

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
            account: t.account,
            transferId: t.transfer_id as string,
          })),
        ...children.map(child => ({
          rowId: child.parent_id as string,
          account: child.account,
          transferId: child.transfer_id as string,
        })),
      ]
    : [];
  const transferKey = legs.map(leg => leg.transferId).join(',');
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
    options: { pageSize: Math.max(legs.length, 1) },
  });

  const othersById = new Map(others.map(other => [other.id, other]));
  const accountsById = new Map(accounts.map(a => [a.id, a]));
  const counterparts = new Map<string, Counterpart>();
  for (const leg of legs) {
    const other = othersById.get(leg.transferId);
    const own = accountsById.get(leg.account);
    const otherAccount = other && accountsById.get(other.account);
    if (
      !other ||
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
  );
}

function BudgetCounterpartAmount({ amount }: { amount: number }) {
  return (
    <BudgetCurrencyFormat>
      <CounterpartAmount amount={amount} />
    </BudgetCurrencyFormat>
  );
}
