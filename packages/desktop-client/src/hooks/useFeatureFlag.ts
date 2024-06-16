import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';
import {
  type GlobalOnlyFeatureFlag,
  type FeatureFlag,
} from 'loot-core/src/types/prefs';

const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  reportBudget: false,
  goalTemplatesEnabled: false,
  customReports: false,
  spendingReport: false,
  simpleFinSync: false,
  multiUser: false,
};

const GLOBAL_ONLY_FEATURE_FLAGS = new Set('multiUser');

function isGlobalOnlyFeatureFlag(
  name: FeatureFlag,
): name is GlobalOnlyFeatureFlag {
  return GLOBAL_ONLY_FEATURE_FLAGS.has(name as GlobalOnlyFeatureFlag);
}

export function useFeatureFlag(name: FeatureFlag): boolean {
  return useSelector((state: State) => {
    if (!isGlobalOnlyFeatureFlag(name)) {
      const value = state.prefs.local[`flags.${name}`];
      if (value !== undefined) {
        return value;
      }

      // Fall back to global prefs if local prefs don't have the flag
    }

    const value = state.prefs.global[`flags.${name}`];
    return value === undefined
      ? DEFAULT_FEATURE_FLAG_STATE[name] || false
      : value;
  });
}
