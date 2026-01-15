import { useMemo } from 'react';

import { useAccounts } from './useAccounts';
import { useSyncedPref } from './useSyncedPref';

/**
 * Hook to get all distinct currencies used by on-budget accounts.
 * Returns array with default currency first, followed by other currencies alphabetically.
 * Returns empty array if multi-currency is not configured.
 */
export function useOnBudgetCurrencies(): string[] {
  const accounts = useAccounts();
  const [defaultCurrencyCode] = useSyncedPref('defaultCurrencyCode');

  return useMemo(() => {
    if (!defaultCurrencyCode) {
      return [];
    }

    const onBudgetAccounts = accounts.filter(
      account => account.closed === 0 && account.offbudget === 0,
    );

    const currencies = new Set<string>();
    currencies.add(defaultCurrencyCode); // Default always first

    for (const account of onBudgetAccounts) {
      const currency = account.currency_code || defaultCurrencyCode;
      currencies.add(currency);
    }

    // Return default first, then others sorted
    const result = [defaultCurrencyCode];
    const others = Array.from(currencies)
      .filter(c => c !== defaultCurrencyCode)
      .sort();
    return [...result, ...others];
  }, [accounts, defaultCurrencyCode]);
}
