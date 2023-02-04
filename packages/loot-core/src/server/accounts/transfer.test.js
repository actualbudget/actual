import { expectSnapshotWithDiffer } from '../../mocks/util';
import * as db from '../db';

import * as transfer from './transfer';

beforeEach(global.emptyDatabase());

function getAllTransactions() {
  return db.all(
    `SELECT t.*, p.name as payee_name
       FROM v_transactions t
       LEFT JOIN payees p ON p.id = t.payee
       ORDER BY date DESC, amount DESC, id
     `
  );
}

async function prepareDatabase() {
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 0 });
  await db.insertCategory({
    id: '1',
    name: 'cat1',
    cat_group: 'group1',
    is_income: 0
  });
  await db.insertAccount({ id: 'one', name: 'one' });
  await db.insertAccount({ id: 'two', name: 'two' });
  await db.insertAccount({ id: 'three', name: 'three', offbudget: 1 });
  await db.insertPayee({ name: '', transfer_acct: 'one' });
  await db.insertPayee({ name: '', transfer_acct: 'two' });
  await db.insertPayee({
    name: '',
    transfer_acct: 'three'
  });
}

describe('Transfer', () => {
  test('transfers are properly inserted/updated/deleted', async () => {
    await prepareDatabase();

    let transaction = {
      account: 'one',
      amount: 5000,
      payee: await db.insertPayee({ name: 'Non-transfer' }),
      date: '2017-01-01'
    };
    await db.insertTransaction(transaction);
    await transfer.onInsert(transaction);

    let differ = expectSnapshotWithDiffer(await getAllTransactions());

    let transferTwo = await db.first(
      "SELECT * FROM payees WHERE transfer_acct = 'two'"
    );
    let transferThree = await db.first(
      "SELECT * FROM payees WHERE transfer_acct = 'three'"
    );

    transaction = {
      account: 'one',
      amount: 5000,
      payee: transferTwo.id,
      date: '2017-01-01'
    };
    transaction.id = await db.insertTransaction(transaction);
    await transfer.onInsert(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    // Fill the transaction out
    transaction = await db.getTransaction(transaction.id);
    expect(transaction.transfer_id).toBeDefined();

    transaction = {
      ...transaction,
      date: '2017-01-05',
      notes: 'This is a note'
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    transaction = {
      ...transaction,
      payee: transferThree.id
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    transaction = {
      ...transaction,
      payee: await db.insertPayee({ name: 'Not transferred anymore' })
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    // Make sure it's not a linked transaction anymore
    transaction = await db.getTransaction(transaction.id);
    expect(transaction.transfer_id).toBeNull();

    // Re-transfer it
    transaction = {
      ...transaction,
      payee: transferTwo.id
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    transaction = await db.getTransaction(transaction.id);
    expect(transaction.transfer_id).toBeDefined();

    await db.deleteTransaction(transaction);
    await transfer.onDelete(transaction);
    differ.expectToMatchDiff(await getAllTransactions());
  });

  test('transfers are properly de-categorized', async () => {
    await prepareDatabase();

    let transferTwo = await db.first(
      "SELECT * FROM payees WHERE transfer_acct = 'two'"
    );
    let transferThree = await db.first(
      "SELECT * FROM payees WHERE transfer_acct = 'three'"
    );

    let transaction = {
      account: 'one',
      amount: 5000,
      payee: await db.insertPayee({ name: 'Non-transfer' }),
      date: '2017-01-01',
      category: '1'
    };
    transaction.id = await db.insertTransaction(transaction);
    await transfer.onInsert(transaction);

    let differ = expectSnapshotWithDiffer(await getAllTransactions());

    transaction = {
      ...(await db.getTransaction(transaction.id)),
      payee: transferThree.id,
      notes: 'hi'
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    transaction = {
      ...(await db.getTransaction(transaction.id)),
      payee: transferTwo.id
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());
  });
});
