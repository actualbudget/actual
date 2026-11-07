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
