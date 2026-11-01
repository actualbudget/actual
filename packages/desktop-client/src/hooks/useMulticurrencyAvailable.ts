import {
  isReviewedCurrency,
  parseAmountEncoding,
} from '@actual-app/core/shared/amount-encoding';

import { useFeatureFlag } from './useFeatureFlag';
import { useSyncedPref } from './useSyncedPref';

/** Mirrors the server gate: both flags and a recorded, reviewed budget currency. */
export function useMulticurrencyAvailable(): boolean {
  const currencyEnabled = useFeatureFlag('currency');
  const multicurrencyEnabled = useFeatureFlag('multicurrency');
  const [encoding] = useSyncedPref('amountEncoding');
  const [defaultCurrencyCode] = useSyncedPref('defaultCurrencyCode');
  const encodedCurrencyCode = parseAmountEncoding(encoding)?.currencyCode;
  return (
    currencyEnabled &&
    multicurrencyEnabled &&
    !!encodedCurrencyCode &&
    isReviewedCurrency(encodedCurrencyCode) &&
    encodedCurrencyCode === defaultCurrencyCode
  );
}
