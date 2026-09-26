import * as db from '#server/db';
import * as prefs from '#server/prefs';

import { initializeImportedAmountEncoding } from './currency';

beforeEach(global.emptyDatabase());

describe('initializeImportedAmountEncoding', () => {
  beforeEach(() => prefs.loadPrefs());

  it('records reviewed currency precision before importing amounts', async () => {
    await initializeImportedAmountEncoding('JPY');

    expect(
      db.firstSync<{ value: string }>(
        "SELECT value FROM preferences WHERE id = 'amountEncoding'",
      )?.value,
    ).toBe(JSON.stringify({ version: 1, currencyCode: 'JPY', precision: 0 }));
    expect(prefs.getPrefs().amountEncoding).toBe(
      JSON.stringify({ version: 1, currencyCode: 'JPY', precision: 0 }),
    );
  });

  it('records a no-symbol two-decimal encoding when currency is missing', async () => {
    await initializeImportedAmountEncoding('');
    expect(
      db.firstSync("SELECT value FROM preferences WHERE id = 'amountEncoding'"),
    ).toEqual({
      value: JSON.stringify({ version: 1, currencyCode: '', precision: 2 }),
    });
  });

  it('rejects unknown source currencies', async () => {
    await expect(initializeImportedAmountEncoding('XYZ')).rejects.toThrow(
      'amount-encoding-unreviewed-currency',
    );
  });
});
