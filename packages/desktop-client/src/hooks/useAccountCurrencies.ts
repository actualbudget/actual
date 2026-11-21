import { useMemo } from 'react';

import { getEffectiveCurrency } from '@actual-app/core/shared/fx/currency';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useAccounts } from './useAccounts';
import { useMultiCurrency } from './useMultiCurrency';

// The effective currency of every account, by id
export function useAccountCurrencies(): ReadonlyMap<
  AccountEntity['id'],
  string
> {
  const { defaultCurrencyCode } = useMultiCurrency();
  const { data: accounts } = useAccounts();

  return useMemo(
    () =>
      new Map(
        (accounts ?? []).map(account => [
          account.id,
          getEffectiveCurrency(account.currency, defaultCurrencyCode),
        ]),
      ),
    [accounts, defaultCurrencyCode],
  );
}
