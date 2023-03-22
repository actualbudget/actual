import { useSelector } from 'react-redux';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

const DEFAULT_FEATURE_FLAG_STATE = {
  newAutocomplete: isNonProductionEnvironment(),
  syncAccount: false,
  goalTemplatesEnabled: false,
};

export default function useFeatureFlag(name) {
  return useSelector(state => {
    const value = state.prefs.local[`flags.${name}`];

    return value === undefined
      ? DEFAULT_FEATURE_FLAG_STATE[name] || false
      : value;
  });
}

export function useAllFeatureFlags() {
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
