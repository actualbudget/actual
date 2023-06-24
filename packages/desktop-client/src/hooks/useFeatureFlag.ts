import { useSelector } from 'react-redux';

const DEFAULT_FEATURE_FLAG_STATE: Record<string, boolean> = {
  reportBudget: false,
  goalTemplatesEnabled: false,
};

export default function useFeatureFlag(name: string): boolean {
  return useSelector(state => {
    const value = state.prefs.local[`flags.${name}`];

    return value === undefined
      ? DEFAULT_FEATURE_FLAG_STATE[name] || false
      : value;
  });
}

export function useAllFeatureFlags(): Record<string, boolean> {
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
