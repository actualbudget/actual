// @ts-strict-ignore
import * as db from '#server/db';

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

describe('categoryForLinkedTransfer', () => {
  const checking = { id: 'checking', offbudget: 0 as const };
  const savings = { id: 'savings', offbudget: 0 as const };
  const brokerage = { id: 'brokerage', offbudget: 1 as const };
  const accounts = [checking, savings, brokerage];

  test('clears the category when both accounts are on budget', () => {
    expect(
      transfer.categoryForLinkedTransfer(
        { account: 'checking', category: 'food' },
        { account: 'savings' },
        accounts,
      ),
    ).toBeNull();
  });

  test('clears the category when both accounts are off budget', () => {
    expect(
      transfer.categoryForLinkedTransfer(
        { account: 'brokerage', category: 'food' },
        { account: 'brokerage-other' },
        [brokerage, { id: 'brokerage-other', offbudget: 1 }],
      ),
    ).toBeNull();
  });

  test('keeps the category on the on-budget side of a cross-budget link', () => {
    expect(
      transfer.categoryForLinkedTransfer(
        { account: 'checking', category: 'income' },
        { account: 'brokerage' },
        accounts,
      ),
    ).toBe('income');
  });

  test('clears the category on the off-budget side of a cross-budget link', () => {
    expect(
      transfer.categoryForLinkedTransfer(
        { account: 'brokerage', category: 'income' },
        { account: 'checking' },
        accounts,
      ),
    ).toBeNull();
  });

  test('keeps a missing category as null on the on-budget side', () => {
    expect(
      transfer.categoryForLinkedTransfer(
        { account: 'checking' },
        { account: 'brokerage' },
        accounts,
      ),
    ).toBeNull();
  });

  test('clears the category when an account is unknown', () => {
    expect(
      transfer.categoryForLinkedTransfer(
        { account: 'checking', category: 'food' },
        { account: 'missing' },
        accounts,
      ),
    ).toBeNull();
  });
});
