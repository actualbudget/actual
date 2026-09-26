import * as sqlite from '#platform/server/sqlite';
import { createAllBudgets } from '#server/budget/base';
import * as cloudStorage from '#server/cloud-storage';
import * as db from '#server/db';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';

import { app } from './app';

beforeEach(global.emptyDatabase());
beforeEach(() => prefs.loadPrefs());
afterEach(() => vi.restoreAllMocks());

for (const [currencyCode, targetPrecision] of [
  ['CLP', 0],
  ['COP', 0],
  ['HUF', 0],
  ['IDR', 0],
  ['PKR', 0],
] as const) {
  it.each([0, 2])(
    `${currencyCode} transitions from recorded %i decimals to its reviewed target`,
    async sourcePrecision => {
      const encoding = JSON.stringify({
        version: 1,
        currencyCode,
        precision: sourcePrecision,
      });
      await prefs.savePrefs({ amountEncoding: encoding });
      db.runQuery(
        "INSERT OR REPLACE INTO preferences (id, value) VALUES ('amountEncoding', ?), ('defaultCurrencyCode', ?)",
        [encoding, currencyCode],
      );
      db.execQuery(
        "INSERT INTO transactions (id, amount) VALUES ('amount', 123450)",
      );
      const options = { currencyCode };
      const { sourceToken } =
        await app.handlers['amount-encoding/preflight'](options);
      expect(
        await app.handlers['amount-encoding/transition']({
          ...options,
          sourceToken,
        }),
      ).toEqual({});
      expect(
        db.firstSync<{ amount: number }>('SELECT amount FROM transactions')
          ?.amount,
      ).toBe(
        targetPrecision === sourcePrecision
          ? 123450
          : targetPrecision === 0
            ? 1234
            : 12345000,
      );
      expect(prefs.getPrefs().amountEncoding).toBe(
        JSON.stringify({
          version: 1,
          currencyCode,
          precision: targetPrecision,
        }),
      );
    },
  );
}

async function changePrecision(currencyCode: string) {
  const options = { currencyCode };
  const { sourceToken } =
    await app.handlers['amount-encoding/preflight'](options);
  return app.handlers['amount-encoding/transition']({
    ...options,
    sourceToken,
  });
}

describe('in-place precision changes', () => {
  it('keeps a budget without a currency at two decimal places', async () => {
    const result = await app.handlers['amount-encoding/preflight']({
      currencyCode: '',
    });
    expect(result.target).toEqual({
      version: 1,
      currencyCode: '',
      precision: 2,
    });
  });

  it('converts legacy amounts in the open database without exporting a copy', async () => {
    vi.spyOn(sqlite, 'exportDatabase').mockImplementation(() => {
      throw new Error('Precision changes must not export the database');
    });
    const database = db.getDatabase();
    db.execQuery(
      "INSERT INTO transactions (id, amount) VALUES ('amount', 123400); INSERT INTO kvcache_key (id, key) VALUES (1, 42);",
    );

    expect(await changePrecision('JPY')).toEqual({});
    expect(db.getDatabase()).toBe(database);
    expect(db.firstSync('SELECT key FROM kvcache_key')).toBeNull();
    expect(
      db.firstSync<{ amount: number }>('SELECT amount FROM transactions')
        ?.amount,
    ).toBe(1234);
  });

  it('does not migrate amounts when the precision stays the same', async () => {
    // An invalid split would reject a rescale, but no rescale is needed here.
    db.execQuery(
      "INSERT INTO transactions (id, amount, isParent) VALUES ('amount', 1234, 1)",
    );
    expect(await changePrecision('USD')).toEqual({});
    expect(await changePrecision('EUR')).toEqual({});
    expect(
      db.firstSync<{ amount: number }>('SELECT amount FROM transactions')
        ?.amount,
    ).toBe(1234);
  });

  it('keeps display preferences unless the currency changes', async () => {
    db.execQuery(
      "INSERT INTO preferences (id, value) VALUES ('defaultCurrencyCode', 'JPY'), ('hideFraction', 'true')",
    );
    const hideFraction = () =>
      db.firstSync<{ value: string }>(
        "SELECT value FROM preferences WHERE id = 'hideFraction'",
      )?.value;

    expect(await changePrecision('JPY')).toEqual({});
    expect(hideFraction()).toBe('true');
    expect(await changePrecision('EUR')).toEqual({});
    expect(hideFraction()).toBe('false');
  });

  it('changes an existing 3dp encoding through the SQLite path', async () => {
    const encoding = JSON.stringify({
      version: 1,
      currencyCode: 'KWD',
      precision: 3,
    });
    await prefs.savePrefs({ amountEncoding: encoding });
    db.execQuery(`
      INSERT INTO preferences (id, value) VALUES ('amountEncoding', '${encoding}');
      INSERT INTO transactions (id, amount) VALUES ('amount', 1230);
    `);

    expect(await changePrecision('USD')).toEqual({});
    expect(
      db.firstSync<{ amount: number }>('SELECT amount FROM transactions')
        ?.amount,
    ).toBe(123);
    expect(prefs.getPrefs().amountEncoding).toBe(
      JSON.stringify({ version: 1, currencyCode: 'USD', precision: 2 }),
    );
  });

  it('rejects stale work before changing encoding or amounts', async () => {
    db.execQuery(
      "INSERT INTO transactions (id, amount) VALUES ('amount', 123400)",
    );
    const options = { currencyCode: 'JPY' };
    const { sourceToken } =
      await app.handlers['amount-encoding/preflight'](options);
    db.runQuery(
      "INSERT OR REPLACE INTO preferences (id, value) VALUES ('defaultCurrencyCode', 'EUR')",
    );

    expect(
      await app.handlers['amount-encoding/transition']({
        ...options,
        sourceToken,
      }),
    ).toEqual({ error: 'amount-encoding-stale', retryable: false });
    expect(
      db.firstSync<{ amount: number }>('SELECT amount FROM transactions')
        ?.amount,
    ).toBe(123400);
    expect(prefs.getPrefs().amountEncoding).toBeUndefined();
  });

  it('leaves encoding and amounts unchanged when conversion fails', async () => {
    db.execQuery(`
      INSERT INTO transactions (id, amount) VALUES ('amount', 123400);
      INSERT INTO rules (id, conditions) VALUES ('bad', '{}');
    `);
    expect(await changePrecision('JPY')).toMatchObject({
      retryable: false,
    });
    expect(prefs.getPrefs().amountEncoding).toBeUndefined();
    expect(
      db.firstSync<{ value: string }>(
        "SELECT value FROM preferences WHERE id = 'amountEncoding'",
      ),
    ).toBeNull();
    expect(
      db.firstSync<{ amount: number }>('SELECT amount FROM transactions')
        ?.amount,
    ).toBe(123400);
  });

  it('rejects a source that changes while preflight awaits the server', async () => {
    await prefs.savePrefs({ cloudFileId: 'cloud', groupId: 'source' });
    db.execQuery(
      "INSERT INTO transactions (id, amount) VALUES ('amount', 123400)",
    );
    const options = { currencyCode: 'JPY' };
    vi.spyOn(cloudStorage, 'supportsAmountEncoding').mockResolvedValue(true);
    const { sourceToken } =
      await app.handlers['amount-encoding/preflight'](options);
    vi.spyOn(cloudStorage, 'supportsAmountEncoding').mockImplementation(
      async () => {
        db.runQuery(
          "INSERT OR REPLACE INTO preferences (id, value) VALUES ('defaultCurrencyCode', 'EUR')",
        );
        return true;
      },
    );

    expect(
      await app.handlers['amount-encoding/transition']({
        ...options,
        sourceToken,
      }),
    ).toEqual({ error: 'amount-encoding-stale', retryable: false });
    expect(
      db.firstSync<{ amount: number }>('SELECT amount FROM transactions')
        ?.amount,
    ).toBe(123400);
  });

  it('retries publication without converting a second time', async () => {
    await prefs.savePrefs({ cloudFileId: 'cloud', groupId: 'source' });
    vi.spyOn(cloudStorage, 'supportsAmountEncoding').mockResolvedValue(true);
    const publish = vi
      .spyOn(cloudStorage, 'publishAmountEncodingTransition')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('target');
    db.execQuery(
      "INSERT INTO transactions (id, amount) VALUES ('amount', 123400)",
    );
    expect(await changePrecision('JPY')).toMatchObject({
      retryable: true,
    });
    expect(prefs.getPrefs().amountEncodingTransition).toBeDefined();
    expect(await app.handlers['amount-encoding/retry']()).toEqual({});
    expect(publish).toHaveBeenCalledTimes(2);
    expect(prefs.getPrefs().amountEncodingTransition).toBeUndefined();
    expect(
      db.firstSync<{ amount: number }>('SELECT amount FROM transactions')
        ?.amount,
    ).toBe(1234);
  });

  it('does not publish a pending change for a different currency', async () => {
    await prefs.savePrefs({ cloudFileId: 'cloud', groupId: 'source' });
    vi.spyOn(cloudStorage, 'supportsAmountEncoding').mockResolvedValue(true);
    const publish = vi
      .spyOn(cloudStorage, 'publishAmountEncodingTransition')
      .mockRejectedValueOnce(new Error('offline'));
    expect(await changePrecision('JPY')).toMatchObject({ retryable: true });
    const pending = prefs.getPrefs().amountEncodingTransition;
    expect(pending?.targetCurrencyCode).toBe('JPY');

    const options = { currencyCode: 'EUR' };
    const { sourceToken } =
      await app.handlers['amount-encoding/preflight'](options);
    expect(
      await app.handlers['amount-encoding/transition']({
        ...options,
        sourceToken,
      }),
    ).toEqual({
      error: 'amount-encoding-pending-currency',
      pendingCurrency: 'JPY',
      retryable: false,
    });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(prefs.getPrefs().amountEncodingTransition).toEqual(pending);
    expect(prefs.getPrefs().amountEncoding).toContain('"currencyCode":"JPY"');
  });
});

describe('spreadsheet after a precision change', () => {
  afterEach(() => sheet.unloadSpreadsheet());

  it('recomputes open balance cells and keeps budget cells', async () => {
    await db.insertCategoryGroup({
      id: 'income',
      name: 'Income',
      is_income: 1,
    });
    await db.insertCategory({
      id: 'salary',
      name: 'Salary',
      cat_group: 'income',
      is_income: 1,
    });
    await db.insertAccount({ id: 'acct', name: 'Checking', offbudget: 0 });
    await db.insertTransaction({
      id: 'txn',
      account: 'acct',
      amount: 123400,
      date: monthUtils.currentDay(),
    });
    await sheet.loadSpreadsheet(db);
    await createAllBudgets();
    // The sidebar registers its balance cells once, when it mounts.
    sheet
      .get()
      .createQuery(
        '__global',
        'onbudget-accounts-balance',
        q('transactions')
          .filter({ 'account.offbudget': false })
          .calculate({ $sum: '$amount' })
          .serialize(),
      );
    await sheet.waitOnSpreadsheet();
    expect(sheet.getCellValue('__global', 'onbudget-accounts-balance')).toBe(
      123400,
    );

    expect(await changePrecision('JPY')).toEqual({});
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue('__global', 'onbudget-accounts-balance')).toBe(
      1234,
    );
    const month = monthUtils.sheetForMonth(monthUtils.currentMonth());
    expect(sheet.get().meta().budgetType).toBe('envelope');
    expect(sheet.getCellValue(month, 'total-income')).toBe(0);
    expect(sheet.getCellValue(month, 'total-spent')).toBe(0);
    expect(sheet.getCellValue(month, 'to-budget')).toBe(0);
  });
});
