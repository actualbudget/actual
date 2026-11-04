import { convertTotal } from '@actual-app/core/shared/fx/convert';
import type { ConvertedTotal } from '@actual-app/core/shared/fx/convert';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useAccountBalances } from './useAccountBalances';
import { useExchangeRates } from './useExchangeRates';
import { useMultiCurrency } from './useMultiCurrency';

type ConvertedAccountsTotal = Pick<
  ConvertedTotal,
  'total' | 'withoutRate' | 'hasFallback'
>;

// The sum of the balances of `accounts`, each converted into the budget's
// default currency at the latest rate. It updates whenever a balance, an
// account currency or an exchange rate changes. Null until every balance
// and the rates have loaded, so a total never shows a partial sum or
// counts other currencies 1:1 first.
export function useConvertedAccountsTotal(
  accounts: ReadonlyArray<Pick<AccountEntity, 'id' | 'currency'>>,
): ConvertedAccountsTotal | null {
  const { defaultCurrencyCode, getAccountCurrency } = useMultiCurrency();
  const { rateIndex, isLoading } = useExchangeRates();
  const balances = useAccountBalances(accounts.map(account => account.id));

  if (isLoading || accounts.some(account => balances[account.id] == null)) {
    return null;
  }

  return convertTotal(
    accounts.map(account => ({
      id: account.id,
      amount: balances[account.id] ?? 0,
      currency: getAccountCurrency(account),
    })),
    defaultCurrencyCode,
    rateIndex,
  );
}
