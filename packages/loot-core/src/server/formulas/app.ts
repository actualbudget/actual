import { createApp } from '#server/app';
import { loadUserPreferencesForFormulas } from '#server/formulas/customFunctionsPreferences';

export type FormulasHandlers = {
  'formula-load-user-preferences': typeof loadUserPreferencesForFormulas;
};

export const app = createApp<FormulasHandlers>();

app.method('formula-load-user-preferences', loadUserPreferencesForFormulas);
