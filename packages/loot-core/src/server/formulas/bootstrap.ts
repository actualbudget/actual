import { setCachedUserPreferences } from '#shared/formulas/customFunctions';

import { loadUserPreferencesForFormulas } from './customFunctionsPreferences';

let formulaPreferencesPromise: Promise<void> | null = null;

export function ensureFormulaPreferencesLoaded(): Promise<void> {
  formulaPreferencesPromise ??= loadUserPreferencesForFormulas().then(prefs => {
    setCachedUserPreferences(prefs);
  });

  return formulaPreferencesPromise;
}
