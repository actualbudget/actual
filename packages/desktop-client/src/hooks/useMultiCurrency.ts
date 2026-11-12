import {
  getEffectiveCurrency,
  isSupportedCurrencyCode,
} from '@actual-app/core/shared/fx/currency';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useFeatureFlag } from './useFeatureFlag';
import { useSyncedPref } from './useSyncedPref';

export function useMultiCurrency() {
  const isCurrencyEnabled = useFeatureFlag('currency');
  const isMultiCurrencyEnabled = useFeatureFlag('multiCurrency');
  const [defaultCurrencyCode = ''] = useSyncedPref('defaultCurrencyCode');

  return {
    // Multiple currencies only make sense once the budget has a default
    // currency to convert into, and one they support
    isEnabled:
      isCurrencyEnabled &&
      isMultiCurrencyEnabled &&
      isSupportedCurrencyCode(defaultCurrencyCode),
    defaultCurrencyCode,
    getAccountCurrency: (account: Pick<AccountEntity, 'currency'>) =>
      getEffectiveCurrency(account.currency, defaultCurrencyCode),
  };
}

// The currency of an amount while multiple currencies are on, when it isn't
// the default one. Amounts in the default currency, even of an account set
// to it explicitly, follow the budget's format.
export function useForeignCurrencyCode(
  currencyCode: string | null | undefined,
): string | undefined {
  const { isEnabled, defaultCurrencyCode } = useMultiCurrency();
  return isEnabled && currencyCode && currencyCode !== defaultCurrencyCode
    ? currencyCode
    : undefined;
}
