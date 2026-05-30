import { createApp } from '#server/app';
import { resetFormulaPreferencesCache } from '#server/formulas/bootstrap';
import { loadUserPreferencesForFormulas } from '#server/formulas/customFunctionsPreferences';

export type FormulasHandlers = {
  'formula-load-user-preferences': typeof loadUserPreferencesForFormulas;
  'formula-reset-preferences-cache': typeof resetFormulaPreferencesCacheHandler;
};

export const app = createApp<FormulasHandlers>();

app.method('formula-load-user-preferences', loadUserPreferencesForFormulas);
app.method(
  'formula-reset-preferences-cache',
  resetFormulaPreferencesCacheHandler,
);

async function resetFormulaPreferencesCacheHandler(): Promise<void> {
  resetFormulaPreferencesCache();
}
