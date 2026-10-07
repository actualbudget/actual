import { beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';

import { batchUpdateTransactions } from './index';

beforeEach(global.emptyDatabase());

describe('batchUpdateTransactions', () => {
  it('returns the added, updated and deleted transactions separately', async () => {
    await db.insertAccount({ id: 'one', name: 'one' });
    await db.insertTransaction({
      id: 'to-update',
      account: 'one',
      amount: 100,
      date: '2024-01-01',
    });
    await db.insertTransaction({
      id: 'to-delete',
      account: 'one',
      amount: 200,
      date: '2024-01-02',
    });

    const result = await batchUpdateTransactions({
      added: [{ id: 'added', account: 'one', amount: 300, date: '2024-01-03' }],
      updated: [{ id: 'to-update', amount: 150 }],
      deleted: [{ id: 'to-delete' }],
      // With transfers enabled the returned updates only carry
      // transfer changes; this test is about the partitioning
      runTransfers: false,
    });

    expect(result.added.map(transaction => transaction.id)).toEqual(['added']);
    expect(result.updated.map(transaction => transaction?.id)).toEqual([
      'to-update',
    ]);
    expect(result.deleted.map(transaction => transaction.id)).toEqual([
      'to-delete',
    ]);
    expect(result.errors).toEqual([]);

    const remaining = await db.all<{ id: string; amount: number }>(
      'SELECT id, amount FROM v_transactions_internal WHERE tombstone = 0 ORDER BY id',
    );
    expect(remaining).toEqual([
      { id: 'added', amount: 300 },
      { id: 'to-update', amount: 150 },
    ]);
  });

  it('does not add any transactions when only editing a field', async () => {
    await db.insertAccount({ id: 'one', name: 'one' });
    await db.insertTransaction({
      id: 't1',
      account: 'one',
      amount: 100,
      date: '2024-01-01',
    });

    const result = await batchUpdateTransactions({
      updated: [{ id: 't1', notes: 'hello' }],
      runTransfers: false,
    });

    expect(result.added).toEqual([]);
    expect(result.deleted).toEqual([]);
    expect(result.updated.map(transaction => transaction?.id)).toEqual(['t1']);
    const updated = await db.first<{ notes: string }>(
      'SELECT notes FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(updated?.notes).toBe('hello');
  });
});
