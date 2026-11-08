import { parseAmountEncoding } from '@actual-app/core/shared/amount-encoding';

import { useSyncedPref } from './useSyncedPref';

export function useAmountPrecision(): number {
  const [encoding] = useSyncedPref('amountEncoding');
  // Stored integers keep their recorded scale even if feature flags change.
  return parseAmountEncoding(encoding)?.precision ?? 2;
}
