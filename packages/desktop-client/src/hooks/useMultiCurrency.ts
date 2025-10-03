import { useFeatureFlag } from './useFeatureFlag';
import { useSyncedPref } from './useSyncedPref';

/**
 * Hook to check if multi-currency support is enabled.
 * Requires both the experimental currency feature flag and the user setting to be enabled.
 */
export function useMultiCurrency() {
  const isCurrencyExperimentalEnabled = useFeatureFlag('currency');
  const [enableMultiCurrency] = useSyncedPref('enableMultiCurrency');

  const isMultiCurrencyEnabled =
    isCurrencyExperimentalEnabled && enableMultiCurrency === 'true';

  return {
    isMultiCurrencyEnabled,
  };
}
