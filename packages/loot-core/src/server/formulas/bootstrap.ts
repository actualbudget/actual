import {
  clearCachedUserPreferences,
  setCachedUserPreferences,
} from '#shared/formulas/customFunctions';

import { loadUserPreferencesForFormulas } from './customFunctionsPreferences';

let formulaPreferencesPromise: Promise<void> | null = null;
let formulaPreferencesCacheVersion = 0;

export function resetFormulaPreferencesCache(): void {
  formulaPreferencesCacheVersion += 1;
  formulaPreferencesPromise = null;
  clearCachedUserPreferences();
}

export function ensureFormulaPreferencesLoaded(): Promise<void> {
  const cacheVersion = formulaPreferencesCacheVersion;

  formulaPreferencesPromise ??= loadUserPreferencesForFormulas().then(prefs => {
    if (cacheVersion === formulaPreferencesCacheVersion) {
      setCachedUserPreferences(prefs);
    }
  });

  return formulaPreferencesPromise;
}
