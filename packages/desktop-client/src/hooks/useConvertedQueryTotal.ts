import { useEffect, useState } from 'react';

import { convertTotal } from '@actual-app/core/shared/fx/convert';
import type { ConvertedTotal } from '@actual-app/core/shared/fx/convert';
import { Query } from '@actual-app/core/shared/query';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import { useQuery as useReactQuery } from '@tanstack/react-query';

import { accountQueries } from '#accounts';
import { liveQuery } from '#queries/liveQuery';

import { useExchangeRates } from './useExchangeRates';
import { useMultiCurrency } from './useMultiCurrency';

type AccountSum = { account: string; amount: number | null };

type ConvertedQueryTotal = {
  // Null while the accounts, their sums or the rates are loading
  total: IntegerAmount | null;
  withoutRate: ConvertedTotal['withoutRate'];
};

const LOADING: ConvertedQueryTotal = { total: null, withoutRate: [] };

// The sum of the `amount` of the transactions `query` matches, with the
// part of each account converted into the budget's default currency at the
// latest rate. Returns null when no conversion is needed (multiple
// currencies off, or every account uses the default currency), so callers
// keep their regular total. While it is loading the total is null rather
// than the regular one, which would add every currency up 1:1. Nothing is
// loaded while the feature is off.
export function useConvertedQueryTotal(
  query: Query | null,
  // By default the query's own split option applies, so the total counts
  // the same transactions as the regular one; 'all' is for queries that
  // already pick the exact transactions to add up
  { splits }: { splits?: 'all' } = {},
): ConvertedQueryTotal | null {
  const { isEnabled, defaultCurrencyCode, getAccountCurrency } =
    useMultiCurrency();
  // Until they load the accounts are a placeholder list
  const { data: accounts = [], isPlaceholderData: isLoadingAccounts } =
    useReactQuery({
      ...accountQueries.list(),
      enabled: isEnabled,
    });
  const { rateIndex, isLoading: isLoadingRates } = useExchangeRates({
    enabled: isEnabled,
  });

  const hasOtherCurrencies =
    isEnabled &&
    accounts.some(
      account => getAccountCurrency(account) !== defaultCurrencyCode,
    );

  const grouped =
    hasOtherCurrencies && query
      ? (splits ? query.options({ splits }) : query)
          .groupBy('account')
          .select(['account', { amount: { $sum: '$amount' } }])
      : null;
  // Callers rebuild their query every render, so its serialized form is
  // what identifies it
  const groupedKey = grouped ? grouped.serializeAsString() : null;

  const [rows, setRows] = useState<readonly AccountSum[] | null>(null);

  useEffect(() => {
    if (groupedKey === null) {
      return;
    }
    // Rebuilt from its serialized form so the subscription only restarts
    // when the query itself changes
    const live = liveQuery<AccountSum>(new Query(JSON.parse(groupedKey)), {
      onData: setRows,
    });
    return () => live.unsubscribe();
  }, [groupedKey]);

  if (!isEnabled || !query) {
    return null;
  }
  if (isLoadingAccounts) {
    return LOADING;
  }
  if (!grouped) {
    return null;
  }
  // While a new query loads, the previous total stays
  if (rows === null || isLoadingRates) {
    return LOADING;
  }

  const accountsById = new Map(accounts.map(account => [account.id, account]));
  return convertTotal(
    rows.map(row => {
      const account = accountsById.get(row.account);
      return {
        id: row.account,
        amount: row.amount ?? 0,
        currency: account ? getAccountCurrency(account) : defaultCurrencyCode,
      };
    }),
    defaultCurrencyCode,
    rateIndex,
  );
}
