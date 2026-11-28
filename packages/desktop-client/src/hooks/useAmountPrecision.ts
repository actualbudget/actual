import { parseAmountEncoding } from '@actual-app/core/shared/amount-encoding';

import { useCurrencyFormatOverride } from './currencyFormatContext';
import { useSyncedPref } from './useSyncedPref';

export function useAmountPrecision(): number {
  const [encoding] = useSyncedPref('amountEncoding');
  const override = useCurrencyFormatOverride();
  // Stored integers keep their recorded scale even if feature flags change;
  // inside a foreign account the account's recorded precision applies.
  return override?.precision ?? parseAmountEncoding(encoding)?.precision ?? 2;
}

/** The budget's recorded precision, for base amounts inside any account. */
export function useBudgetPrecision(): number {
  const [encoding] = useSyncedPref('amountEncoding');
  return parseAmountEncoding(encoding)?.precision ?? 2;
}
