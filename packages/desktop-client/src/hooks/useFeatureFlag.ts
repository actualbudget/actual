import { useSelector } from 'react-redux';

import { type FeatureFlag } from 'loot-core/src/client/state-types/prefs';

const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  reportBudget: false,
  goalTemplatesEnabled: false,
  privacyMode: false,
  themes: false,
  transactionPreview: false,
};

export default function useFeatureFlag(name: FeatureFlag): boolean {
  return useSelector(state => {
    const value = state.prefs.local[`flags.${name}`];

    return value === undefined
      ? DEFAULT_FEATURE_FLAG_STATE[name] || false
      : value;
  });
}
