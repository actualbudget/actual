import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';
import type { FeatureFlag } from 'loot-core/src/types/prefs';

const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  reportBudget: false,
  goalTemplatesEnabled: false,
  customReports: false,
  spendingReport: false,
  simpleFinSync: false,
  splitsInRules: false,
};

export function useFeatureFlag(name: FeatureFlag): boolean {
  return useSelector((state: State) => {
    const value = state.prefs.local[`flags.${name}`];

    return value === undefined
      ? DEFAULT_FEATURE_FLAG_STATE[name] || false
      : value;
  });
}
