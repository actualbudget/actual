import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { batchUpdateTransactions } from '#server/transactions';
import { q } from '#shared/query';
import type { TransactionEntity } from '#types/models';

import {
  isTransferDetectionEnabled,
  linkDetectedTransfers,
} from './transfer-detection';

beforeEach(global.emptyDatabase());

async function prepareDatabase() {
  await db.insertCategoryGroup({ id: 'group', name: 'group', is_income: 0 });
  await db.insertCategory({
    id: 'food',
    name: 'food',
    cat_group: 'group',
    is_income: 0,
  });

  await db.insertAccount({ id: 'checking', name: 'checking' });
  await db.insertAccount({ id: 'savings', name: 'savings' });
  await db.insertAccount({ id: 'card', name: 'card' });
  await db.insertAccount({ id: 'mortgage', name: 'mortgage', offbudget: 1 });
  for (const account of ['checking', 'savings', 'card', 'mortgage']) {
    await db.insertPayee({
      id: 'transfer-' + account,
      name: '',
      transfer_acct: account,
    });
  }
  await db.insertPayee({ id: 'bank-payee', name: 'Online transfer' });
}

function insertTransaction(
  transaction: Partial<TransactionEntity> &
    Pick<TransactionEntity, 'account' | 'amount'>,
) {
  return db.insertTransaction({
    date: '2024-03-10',
    payee: 'bank-payee',
    ...transaction,
  });
}

async function getTransaction(
  id: TransactionEntity['id'],
): Promise<TransactionEntity> {
  const { data } = await aqlQuery(q('transactions').filter({ id }).select('*'));
  return data[0];
}

async function expectUnlinked(...ids: Array<TransactionEntity['id']>) {
  for (const id of ids) {
    expect(await getTransaction(id)).toMatchObject({
      payee: 'bank-payee',
      transfer_id: null,
    });
  }
}

describe('isTransferDetectionEnabled', () => {
  test('is off until the experimental feature is enabled', async () => {
    expect(await isTransferDetectionEnabled()).toBe(false);

    await db.update('preferences', {
      id: 'flags.bankSyncTransferDetection',
      value: 'true',
    });
    expect(await isTransferDetectionEnabled()).toBe(true);

    await db.update('preferences', {
      id: 'flags.bankSyncTransferDetection',
      value: 'false',
    });
    expect(await isTransferDetectionEnabled()).toBe(false);
  });
});

describe('linkDetectedTransfers', () => {
  beforeEach(prepareDatabase);

  test('links a transaction to the other side of the transfer', async () => {
    const outgoing = await insertTransaction({
      account: 'checking',
      amount: -5000,
      category: 'food',
      imported_payee: 'To savings',
    });
    const incoming = await insertTransaction({
      account: 'savings',
      amount: 5000,
      date: '2024-03-11',
      notes: 'monthly savings',
    });

    expect(await linkDetectedTransfers([incoming])).toEqual([outgoing]);

    expect(await getTransaction(outgoing)).toMatchObject({
      account: 'checking',
      amount: -5000,
      date: '2024-03-10',
      payee: 'transfer-savings',
      transfer_id: incoming,
      category: null,
      imported_payee: 'To savings',
    });
    expect(await getTransaction(incoming)).toMatchObject({
      account: 'savings',
      amount: 5000,
      date: '2024-03-11',
      payee: 'transfer-checking',
      transfer_id: outgoing,
      category: null,
      notes: 'monthly savings',
    });
  });

  test('keeps the category of a transfer to an off budget account', async () => {
    const payment = await insertTransaction({
      account: 'checking',
      amount: -120000,
      category: 'food',
    });
    const received = await insertTransaction({
      account: 'mortgage',
      amount: 120000,
    });

    expect(await linkDetectedTransfers([received])).toEqual([payment]);

    expect(await getTransaction(payment)).toMatchObject({
      payee: 'transfer-mortgage',
      transfer_id: received,
      category: 'food',
    });
    expect(await getTransaction(received)).toMatchObject({
      payee: 'transfer-checking',
      transfer_id: payment,
      category: null,
    });
  });

  test('links transactions up to three days apart', async () => {
    const friday = await insertTransaction({
      account: 'checking',
      amount: -5000,
      date: '2024-03-08',
    });
    const monday = await insertTransaction({
      account: 'savings',
      amount: 5000,
      date: '2024-03-11',
    });
    const tooLate = await insertTransaction({
      account: 'savings',
      amount: 7500,
      date: '2024-03-12',
    });
    const tooEarly = await insertTransaction({
      account: 'checking',
      amount: -7500,
      date: '2024-03-08',
    });

    expect(await linkDetectedTransfers([monday, tooLate])).toEqual([friday]);

    expect(await getTransaction(monday)).toMatchObject({ transfer_id: friday });
    await expectUnlinked(tooLate, tooEarly);
  });

  test('does not guess between several possible counterparts', async () => {
    const incoming = await insertTransaction({
      account: 'savings',
      amount: 5000,
    });
    const fromChecking = await insertTransaction({
      account: 'checking',
      amount: -5000,
    });
    const fromCard = await insertTransaction({
      account: 'card',
      amount: -5000,
      date: '2024-03-12',
    });

    expect(await linkDetectedTransfers([incoming])).toEqual([]);
    await expectUnlinked(incoming, fromChecking, fromCard);
  });

  test('does not guess which transaction a counterpart belongs to', async () => {
    const outgoing = await insertTransaction({
      account: 'checking',
      amount: -5000,
    });
    const first = await insertTransaction({ account: 'savings', amount: 5000 });
    // Not part of this import, but it could be the other side just as well
    const second = await insertTransaction({
      account: 'savings',
      amount: 5000,
      date: '2024-03-13',
    });

    expect(await linkDetectedTransfers([outgoing])).toEqual([]);
    expect(await linkDetectedTransfers([first])).toEqual([]);
    await expectUnlinked(outgoing, first, second);
  });

  test('does not link transactions in the same account', async () => {
    const charge = await insertTransaction({ account: 'card', amount: -5000 });
    const refund = await insertTransaction({ account: 'card', amount: 5000 });

    expect(await linkDetectedTransfers([charge, refund])).toEqual([]);
    await expectUnlinked(charge, refund);
  });

  test('links a pair once when both sides are given', async () => {
    const outgoing = await insertTransaction({
      account: 'checking',
      amount: -5000,
    });
    const incoming = await insertTransaction({
      account: 'savings',
      amount: 5000,
    });

    const linked = await linkDetectedTransfers([outgoing, incoming]);

    expect(linked).toHaveLength(1);
    expect(await getTransaction(outgoing)).toMatchObject({
      payee: 'transfer-savings',
      transfer_id: incoming,
    });
    expect(await getTransaction(incoming)).toMatchObject({
      payee: 'transfer-checking',
      transfer_id: outgoing,
    });
  });

  test('links several transfers at once', async () => {
    const toSavings = await insertTransaction({
      account: 'checking',
      amount: -5000,
    });
    const toCard = await insertTransaction({
      account: 'checking',
      amount: -32100,
    });
    const groceries = await insertTransaction({
      account: 'checking',
      amount: -4200,
    });
    const savingsSide = await insertTransaction({
      account: 'savings',
      amount: 5000,
    });
    const cardSide = await insertTransaction({
      account: 'card',
      amount: 32100,
    });

    expect(
      (await linkDetectedTransfers([toSavings, toCard, groceries])).sort(),
    ).toEqual([savingsSide, cardSide].sort());

    expect(await getTransaction(toSavings)).toMatchObject({
      payee: 'transfer-savings',
      transfer_id: savingsSide,
    });
    expect(await getTransaction(toCard)).toMatchObject({
      payee: 'transfer-card',
      transfer_id: cardSide,
    });
    await expectUnlinked(groceries);
  });

  test('leaves existing transfers alone', async () => {
    const outgoing = await insertTransaction({
      account: 'checking',
      amount: -5000,
      payee: 'transfer-savings',
      transfer_id: 'existing-incoming',
    });
    await insertTransaction({
      id: 'existing-incoming',
      account: 'savings',
      amount: 5000,
      payee: 'transfer-checking',
      transfer_id: outgoing,
    });
    const unrelated = await insertTransaction({
      account: 'card',
      amount: 5000,
    });

    expect(await linkDetectedTransfers([unrelated])).toEqual([]);
    expect(await linkDetectedTransfers([outgoing])).toEqual([]);

    await expectUnlinked(unrelated);
    expect(await getTransaction(outgoing)).toMatchObject({
      payee: 'transfer-savings',
      transfer_id: 'existing-incoming',
    });
  });

  test.each([
    ['a reconciled transaction', { reconciled: true }],
    ['a starting balance', { starting_balance_flag: true }],
    ['a deleted transaction', { tombstone: true }],
  ])('does not link to %s', async (_, fields) => {
    const existing = await insertTransaction({
      account: 'checking',
      amount: -5000,
      ...fields,
    });
    const incoming = await insertTransaction({
      account: 'savings',
      amount: 5000,
    });

    expect(await linkDetectedTransfers([incoming])).toEqual([]);
    await expectUnlinked(incoming);
    // Read it from the internal view, which includes deleted transactions
    expect(
      await db.first<
        Pick<db.DbViewTransactionInternal, 'payee' | 'transfer_id'>
      >('SELECT payee, transfer_id FROM v_transactions_internal WHERE id = ?', [
        existing,
      ]),
    ).toEqual({ payee: 'bank-payee', transfer_id: null });
  });

  test('does not link a transfer again after the user undid it', async () => {
    const outgoing = await insertTransaction({
      account: 'checking',
      amount: -5000,
    });
    const incoming = await insertTransaction({
      account: 'savings',
      amount: 5000,
      imported_id: 'bank-id',
    });
    expect(await linkDetectedTransfers([incoming])).toEqual([outgoing]);

    // Changing the payee back removes the other side of the transfer...
    await batchUpdateTransactions({
      updated: [{ id: outgoing, payee: 'bank-payee' }],
    });
    expect(await getTransaction(incoming)).toBeUndefined();

    // ...which the next bank sync imports again
    const importedAgain = await insertTransaction({
      account: 'savings',
      amount: 5000,
      imported_id: 'bank-id',
    });

    expect(await linkDetectedTransfers([importedAgain])).toEqual([]);
    await expectUnlinked(outgoing, importedAgain);
  });

  test('does not link another transaction to one the user unlinked', async () => {
    const outgoing = await insertTransaction({
      account: 'checking',
      amount: -5000,
    });
    const incoming = await insertTransaction({
      account: 'savings',
      amount: 5000,
      imported_id: 'bank-id',
    });
    expect(await linkDetectedTransfers([incoming])).toEqual([outgoing]);

    // The user undoes the transfer and the other side is imported again
    await batchUpdateTransactions({
      updated: [{ id: outgoing, payee: 'bank-payee' }],
    });
    const importedAgain = await insertTransaction({
      account: 'savings',
      amount: 5000,
      imported_id: 'bank-id',
    });
    expect(await linkDetectedTransfers([importedAgain])).toEqual([]);

    // Once the side that was kept is reconciled, a new transaction has only
    // the transaction that was imported again left to pair with
    await db.updateTransaction({ id: outgoing, reconciled: true });
    const unrelated = await insertTransaction({
      account: 'card',
      amount: -5000,
      date: '2024-03-11',
    });

    expect(await linkDetectedTransfers([unrelated])).toEqual([]);
    await expectUnlinked(outgoing, importedAgain, unrelated);
  });

  test('does not link to part of a split transaction', async () => {
    const parent = await insertTransaction({
      account: 'checking',
      amount: -5000,
      is_parent: true,
    });
    const child = await insertTransaction({
      account: 'checking',
      amount: -3000,
      is_child: true,
      parent_id: parent,
    });
    const sameAsParent = await insertTransaction({
      account: 'savings',
      amount: 5000,
    });
    const sameAsChild = await insertTransaction({
      account: 'savings',
      amount: 3000,
    });

    expect(await linkDetectedTransfers([sameAsParent, sameAsChild])).toEqual(
      [],
    );
    await expectUnlinked(sameAsParent, sameAsChild);
    expect(await getTransaction(child)).toMatchObject({ transfer_id: null });
  });

  test('does not link to a transaction in a closed account', async () => {
    await db.updateAccount({ id: 'checking', closed: 1 });
    const existing = await insertTransaction({
      account: 'checking',
      amount: -5000,
    });
    const incoming = await insertTransaction({
      account: 'savings',
      amount: 5000,
    });

    expect(await linkDetectedTransfers([incoming])).toEqual([]);
    await expectUnlinked(existing, incoming);
  });
});
