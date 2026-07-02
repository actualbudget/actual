import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import { setDefaultCurrencyCode } from '#server/util/currency';

import { app } from './app';

const createAccountHandler = app.handlers['account-create'];

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
});

describe('createAccount starting balance encoding', () => {
  it('USD (2dp): balance 12.34 stores as integer 1234', async () => {
    await setDefaultCurrencyCode('USD');
    const id = await runMutator(() =>
      createAccountHandler({ name: 'Checking', balance: 12.34 }),
    );
    const txns = db.runQuery<{ amount: number }>(
      'SELECT amount FROM transactions WHERE acct = ? AND starting_balance_flag = 1',
      [id],
      true,
    );
    expect(txns[0].amount).toBe(1234);
  });

  it('JPY (0dp): balance 50000 stores as integer 50000, not 5000000', async () => {
    await setDefaultCurrencyCode('JPY');
    const id = await runMutator(() =>
      createAccountHandler({ name: 'Savings', balance: 50000 }),
    );
    const txns = db.runQuery<{ amount: number }>(
      'SELECT amount FROM transactions WHERE acct = ? AND starting_balance_flag = 1',
      [id],
      true,
    );
    expect(txns[0].amount).toBe(50000);
  });

  it('unset currency (empty string): treats as 2dp', async () => {
    await setDefaultCurrencyCode('');
    const id = await runMutator(() =>
      createAccountHandler({ name: 'Generic', balance: 10.5 }),
    );
    const txns = db.runQuery<{ amount: number }>(
      'SELECT amount FROM transactions WHERE acct = ? AND starting_balance_flag = 1',
      [id],
      true,
    );
    expect(txns[0].amount).toBe(1050);
  });
});
