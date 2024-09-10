import type { FeatureFlag } from 'loot-core/src/types/prefs';

import { useSyncedPref } from './useSyncedPref';

const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  reportBudget: false,
  goalTemplatesEnabled: false,
  spendingReport: false,
  simpleFinSync: false,
  dashboards: false,
};

export function useFeatureFlag(name: FeatureFlag): boolean {
  const [value] = useSyncedPref(`flags.${name}`);

  return value === undefined
    ? DEFAULT_FEATURE_FLAG_STATE[name] || false
    : String(value) === 'true';
}
