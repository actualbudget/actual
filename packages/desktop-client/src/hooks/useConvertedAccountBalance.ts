import { useEffect, useState } from 'react';

import { listen, send } from 'loot-core/platform/client/fetch';

import { useSyncedPref } from './useSyncedPref';

type AccountFilter = {
  offbudget?: boolean;
  closed?: boolean;
  accountId?: string;
};

export type CurrencyBalance = {
  currency: string;
  balance: number;
};

export type ConvertedBalanceData = {
  convertedBalance: number;
  balances: CurrencyBalance[];
  convertedCurrency: string | undefined;
};

export type ConvertedBalanceResult = {
  convertedBalance: number;
  balances: CurrencyBalance[];
} | null;

/**
 * Hook to get account balances converted to a target currency.
 * Uses server-side currency conversion with exchange rates.
 *
 * @param targetCurrency - Currency code to convert to (e.g., 'USD'), or undefined
 * @param accountFilter - Optional filter for accounts (e.g., { offbudget: true })
 * @returns Object with converted balance and breakdown by currency, or null if loading/error
 */
export function useConvertedAccountBalance(
  targetCurrency: string | undefined,
  accountFilter: AccountFilter = {},
): ConvertedBalanceResult {
  const [result, setResult] = useState<ConvertedBalanceResult>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchConvertedBalance() {
      // Don't fetch if targetCurrency is not defined
      if (!targetCurrency) {
        if (mounted) {
          setResult(null);
        }
        return;
      }

      try {
        const data = await send('account-balance-converted', {
          targetCurrency,
          accountFilter,
        });

        if (mounted) {
          setResult(data);
        }
      } catch (error) {
        console.error('Error fetching converted account balance:', error);
        if (mounted) {
          setResult(null);
        }
      }
    }

    fetchConvertedBalance();

    // Listen for sync events to refetch when accounts or transactions change
    const unlisten = listen('sync-event', event => {
      if (
        (event.type === 'applied' || event.type === 'success') &&
        event.tables &&
        (event.tables.includes('accounts') ||
          event.tables.includes('transactions'))
      ) {
        fetchConvertedBalance();
      }
    });

    return () => {
      mounted = false;
      unlisten();
    };
  }, [targetCurrency, accountFilter]);

  return result;
} /**
 * Hook to get all account balances converted to the default currency.
 */
export function useAllAccountBalanceConverted(): ConvertedBalanceResult {
  const [defaultCurrency] = useSyncedPref('defaultCurrencyCode');
  return useConvertedAccountBalance(defaultCurrency, {});
}

/**
 * Hook to get on-budget account balances converted to the default currency.
 */
export function useOnBudgetAccountBalanceConverted(): ConvertedBalanceResult {
  const [defaultCurrency] = useSyncedPref('defaultCurrencyCode');
  return useConvertedAccountBalance(defaultCurrency, {
    offbudget: false,
    closed: false,
  });
}

/**
 * Hook to get off-budget account balances converted to the default currency.
 */
export function useOffBudgetAccountBalanceConverted(): ConvertedBalanceResult {
  const [defaultCurrency] = useSyncedPref('defaultCurrencyCode');
  return useConvertedAccountBalance(defaultCurrency, {
    offbudget: true,
    closed: false,
  });
}

/**
 * Hook to get a specific account's balance converted to the default currency.
 *
 * @param accountId - The ID of the account to get the converted balance for
 * @returns Object with converted balance and breakdown, or null if loading/error
 */
export function useAccountConvertedBalance(
  accountId: string | undefined,
): ConvertedBalanceResult {
  const [defaultCurrency] = useSyncedPref('defaultCurrencyCode');
  return useConvertedAccountBalance(
    defaultCurrency,
    accountId ? { accountId } : {},
  );
}
