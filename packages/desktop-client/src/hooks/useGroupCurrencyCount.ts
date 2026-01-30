import { type CategoryGroupEntity } from 'loot-core/types/models';

import { useOnBudgetCurrencies } from './useOnBudgetCurrencies';
import { useSyncedPref } from './useSyncedPref';

/**
 * Hook to determine how many currency rows a group should display.
 * Returns the number of currency rows that will be shown for this group.
 * Returns 1 for standard display, or the number of currencies if per-currency rows are shown.
 */
export function useGroupCurrencyCount(
  group: CategoryGroupEntity | null,
): number {
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const currencies = useOnBudgetCurrencies();

  if (
    !group ||
    enableMultiCurrencyOnBudget !== 'true' ||
    currencies.length <= 1
  ) {
    return 1;
  }

  const defaultCurrency = currencies[0];
  const groupCurrencies = currencies.filter(currency =>
    group.categories?.some(cat =>
      currency === defaultCurrency
        ? !cat.currency || cat.currency === currency
        : cat.currency === currency,
    ),
  );

  // Show per-currency rows if:
  // 1. The group has multiple currencies OR
  // 2. The group only has non-default currency categories
  const hasNonDefaultCurrency =
    groupCurrencies.length > 0 && !groupCurrencies.includes(defaultCurrency);
  const hasMultipleCurrencies = groupCurrencies.length > 1;
  const showPerCurrencyRows = hasMultipleCurrencies || hasNonDefaultCurrency;

  return showPerCurrencyRows ? groupCurrencies.length : 1;
}
