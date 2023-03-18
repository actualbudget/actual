import { useSelector } from 'react-redux';

import {
  isDevelopmentEnvironment,
  isPreviewEnvironment,
} from 'loot-design/src/util/environment';

const DEFAULT_FEATURE_FLAG_STATE = {
  newAutocomplete: isDevelopmentEnvironment() || isPreviewEnvironment(),
  goalTemplatesEnabled: false,
};

/**
 * If the feature flag is set: use its value.
 * If the flag is not set (default case): use the
 * pre-defined list of feature flags. If it's not
 * there: fall-back to 'false'.
 */
function getFatureFlagNormalizedValue(name, value) {
  return value === undefined
    ? DEFAULT_FEATURE_FLAG_STATE[name] || false
    : value;
}

export default function useFeatureFlag(name) {
  return useSelector(state =>
    getFatureFlagNormalizedValue(name, state.prefs.local[`flags.${name}`]),
  );
}

export function useAllFeatureFlags() {
  return useSelector(state => {
    return Object.fromEntries(
      Object.entries(state.prefs.local)
        .filter(([key]) => key.startsWith('flags.'))
        .map(([key, value]) => {
          const name = key.replace('flags.', '');
          return [name, getFatureFlagNormalizedValue(name, value)];
        }),
    );
  });
}
