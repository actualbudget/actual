// @ts-strict-ignore
import * as db from '#server/db';
import type { TransactionEntity } from '#types/models';

import * as transfer from './transfer';

beforeEach(global.emptyDatabase());

async function prepareDatabase() {
  await db.insertAccount({ id: 'one', name: 'one' });
  await db.insertAccount({ id: 'two', name: 'two' });
  await db.insertPayee({ name: '', transfer_acct: 'one' });
  await db.insertPayee({ name: '', transfer_acct: 'two' });
}

async function createTransaction(account: string, amount: number, extra = {}) {
  const transaction = {
    id: null,
    account,
    amount,
    payee: await db.insertPayee({ name: 'Non-transfer ' + account }),
    date: '2017-01-01',
    ...extra,
  };
  transaction.id = await db.insertTransaction(transaction);
  return await db.getTransaction(transaction.id);
}

describe('Transfer', () => {
  test('Transfers are properly verified', async () => {
    await prepareDatabase();

    // happy path, two valid transactions
    expect(
      transfer.validForTransfer(
        await createTransaction('one', 5),
        await createTransaction('two', -5),
      ),
    ).toBeTruthy();

    // amount not zeroed out
    expect(
      transfer.validForTransfer(
        await createTransaction('one', 5),
        await createTransaction('two', 5),
      ),
    ).toBeFalsy();

    // amount not match
    expect(
      transfer.validForTransfer(
        await createTransaction('one', 5),
        await createTransaction('two', -6),
      ),
    ).toBeFalsy();

    // accounts match
    expect(
      transfer.validForTransfer(
        await createTransaction('one', 5),
        await createTransaction('one', -5),
      ),
    ).toBeFalsy();

    // one already a transfer
    const existingTransfer = await createTransaction('one', 5);
    expect(
      transfer.validForTransfer(
        await createTransaction('one', 5),
        await createTransaction('two', -5, {
          transfer_id: existingTransfer.id,
        }),
      ),
    ).toBeFalsy();
  });
});

test('native amounts must cancel for transfers between foreign accounts', () => {
  const from = {
    id: 'a',
    account: 'yen',
    amount: -100,
    transaction_amount: -150,
    transfer_id: null,
  } as TransactionEntity;
  const to = (native: number) =>
    ({
      id: 'b',
      account: 'yen2',
      amount: 100,
      transaction_amount: native,
      transfer_id: null,
    }) as TransactionEntity;
  expect(transfer.validForTransfer(from, to(160))).toBe(false);
  expect(transfer.validForTransfer(from, to(150))).toBe(true);
});
