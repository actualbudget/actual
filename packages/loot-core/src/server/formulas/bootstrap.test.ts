import { beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import { Action } from '#server/rules/action';

import {
  ensureFormulaPreferencesLoaded,
  resetFormulaPreferencesCache,
} from './bootstrap';
import { loadUserPreferencesForFormulas } from './customFunctionsPreferences';

function executeFormula(formula: string) {
  const action = new Action('set', 'notes', null, { formula });
  const transaction = { notes: '' };

  action.exec(transaction);

  return transaction.notes;
}

describe('formula preference bootstrap', () => {
  beforeEach(async () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    await (global as any).emptyDatabase()();
    resetFormulaPreferencesCache();
  });

  it('reloads cached user preferences after reset', async () => {
    await ensureFormulaPreferencesLoaded();
    expect(executeFormula('=FORMATNUMBER(1234.5, 2)')).toBe('1,234.50');

    await db.update('preferences', {
      id: 'numberFormat',
      value: 'dot-comma',
    });

    resetFormulaPreferencesCache();
    await ensureFormulaPreferencesLoaded();

    expect(executeFormula('=FORMATNUMBER(1234.5, 2)')).toBe('1.234,50');
  });

  it('infers number separators from locale formatting', async () => {
    const preferences = await loadUserPreferencesForFormulas({
      selectedLocale: 'de-DE',
    });

    expect(preferences.numberFormat).toBe('dot-comma');
    expect(preferences.thousandsSeparator).toBe('.');
    expect(preferences.decimalSeparator).toBe(',');
  });
});
