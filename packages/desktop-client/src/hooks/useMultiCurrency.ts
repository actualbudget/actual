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
