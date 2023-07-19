import { useSelector } from 'react-redux';

import { type FeatureFlag } from 'loot-core/src/client/state-types/prefs';

const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  reportBudget: false,
  goalTemplatesEnabled: false,
  privacyMode: false,
  themes: false,
};

export default function useFeatureFlag(name: FeatureFlag): boolean {
  return useSelector(state => {
    const value = state.prefs.local[`flags.${name}`];

    return value === undefined
      ? DEFAULT_FEATURE_FLAG_STATE[name] || false
      : value;
  });
}

export function useAllFeatureFlags(): Record<FeatureFlag, boolean> {
  return useSelector(state => {
    return {
      ...DEFAULT_FEATURE_FLAG_STATE,
      ...Object.fromEntries(
        Object.entries(state.prefs.local)
          .filter(([key]) => key.startsWith('flags.'))
          .map(([key, value]) => [key.replace('flags.', ''), value]),
      ),
    };
  });
}
