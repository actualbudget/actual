import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';

import { app } from './app';

const createAccount = app.handlers['account-create'];

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
});

async function setPrecision(precision?: number) {
  if (precision === undefined) return;
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision,
    }),
  });
}

async function storedStartingBalance(balance: number) {
  const id = await runMutator(() =>
    createAccount({ name: 'Checking', balance }),
  );
  return db.firstSync<{ amount: number }>(
    'SELECT amount FROM transactions WHERE acct = ? AND starting_balance_flag = 1',
    [id],
  )?.amount;
}

describe('account starting balance encoding', () => {
  it.each([
    [undefined, 12.34, 1234],
    [0, -1234, -1234],
    [2, 12.34, 1234],
    [3, 1.234, 1234],
  ])('stores recorded precision %s', async (precision, balance, expected) => {
    await setPrecision(precision);
    expect(await storedStartingBalance(balance)).toBe(expected);
  });

  it('does not create a starting transaction for zero', async () => {
    await createAccount({ name: 'Checking', balance: 0 });
    expect(
      db.firstSync(
        'SELECT id FROM transactions WHERE starting_balance_flag = 1',
      ),
    ).toBeNull();
  });

  it('rejects an overflowing starting balance', async () => {
    await setPrecision(3);
    await expect(
      storedStartingBalance(Number.MAX_SAFE_INTEGER),
    ).rejects.toThrow('Invalid starting balance');
    expect(db.firstSync('SELECT id FROM accounts')).toBeNull();
  });
});

describe('account currency', () => {
  const updateAccount = app.handlers['account-update'];

  async function setBudgetCurrency(currencyCode: string, precision: number) {
    await db.update('preferences', {
      id: 'defaultCurrencyCode',
      value: currencyCode,
    });
    await prefs.savePrefs({
      amountEncoding: JSON.stringify({ version: 1, currencyCode, precision }),
    });
  }

  it('stores the budget currency as inherited', async () => {
    await setBudgetCurrency('JPY', 0);
    const id = await createAccount({ name: 'Wallet', currency: 'JPY' });
    expect(
      db.firstSync<{ currency: string | null }>(
        'SELECT currency FROM accounts WHERE id = ?',
        [id],
      )?.currency,
    ).toBeNull();
  });

  it('keeps inherited JPY integers unchanged', async () => {
    await setBudgetCurrency('JPY', 0);
    const id = await createAccount({ name: 'Wallet', balanceInteger: 1000 });
    expect(
      db.firstSync<{ amount: number }>(
        'SELECT amount FROM transactions WHERE acct = ?',
        [id],
      )?.amount,
    ).toBe(1000);
  });

  it('rejects foreign creation before foreign posting exists', async () => {
    await setBudgetCurrency('JPY', 0);
    await expect(
      createAccount({ name: 'Dollars', currency: 'USD' }),
    ).rejects.toThrow('multicurrency-unavailable');
    expect(db.firstSync('SELECT id FROM accounts')).toBeNull();
  });

  it('rejects both balance forms together', async () => {
    for (const balance of [1, 0]) {
      await expect(
        createAccount({ name: 'Checking', balance, balanceInteger: 100 }),
      ).rejects.toThrow('Supply either balance or balanceInteger');
    }
    expect(db.firstSync('SELECT id FROM accounts')).toBeNull();
  });

  it('rejects currency changes on populated accounts', async () => {
    await setBudgetCurrency('USD', 2);
    const id = await createAccount({ name: 'Checking', balanceInteger: 100 });
    await expect(updateAccount({ id, currency: 'EUR' })).rejects.toThrow(
      'account-currency-immutable',
    );
    // Stale full-account updates from the UI keep the inherited value.
    await updateAccount({ id, name: 'Renamed', currency: null });
    expect(
      db.firstSync('SELECT name, currency FROM accounts WHERE id = ?', [id]),
    ).toEqual({ name: 'Renamed', currency: null });
  });
});
