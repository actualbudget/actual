import { useOnBudgetCurrencies } from './useOnBudgetCurrencies';
import { useSyncedPref } from './useSyncedPref';

/**
 * Hook to determine if the currency column should be shown in the budget table.
 * Returns true only if multi-currency is enabled AND there are multiple currencies
 * across on-budget accounts.
 */
export function useShowCurrencyColumn(): boolean {
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const currencies = useOnBudgetCurrencies();

  return enableMultiCurrencyOnBudget === 'true' && currencies.length > 1;
}
