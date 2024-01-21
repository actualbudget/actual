// @ts-strict-ignore
import { useSelector } from 'react-redux';

import type { FeatureFlag } from 'loot-core/src/types/prefs';

const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  categorySpendingReport: false,
  sankeyReport: false,
  reportBudget: false,
  goalTemplatesEnabled: false,
  customReports: false,
  simpleFinSync: false,
};

export function useFeatureFlag(name: FeatureFlag): boolean {
  return useSelector(state => {
    const value = state.prefs.local[`flags.${name}`];

    return value === undefined
      ? DEFAULT_FEATURE_FLAG_STATE[name] || false
      : value;
  });
}
