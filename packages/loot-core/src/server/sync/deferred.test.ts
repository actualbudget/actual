import { Timestamp } from '@actual-app/crdt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';

import { replayPendingMessages } from './replay';

import { applyMessages, setSyncingMode } from './index';

beforeEach(() => {
  setSyncingMode('enabled');
  return global.emptyDatabase()();
});

afterEach(() => {
  setSyncingMode('disabled');
});

function sendTimestamp(): Timestamp {
  const timestamp = Timestamp.send();
  if (timestamp == null) {
    throw new Error('Timestamp.send() returned null');
  }
  return timestamp;
}

function getPending(): db.DbPendingMessage[] {
  return db.runQuery<db.DbPendingMessage>(
    'SELECT * FROM messages_pending ORDER BY timestamp',
    [],
    true,
  );
}

describe('Deferred sync messages (newer schema)', () => {
  it('defers messages for unknown columns without failing the batch', async () => {
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'brand_new_column',
          value: 'hello',
          timestamp: sendTimestamp(),
        },
        {
          dataset: 'transactions',
          row: 't1',
          column: 'amount',
          value: 1234,
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );

    // The known-column message must still create the row, even though
    // the unknown-column message for the same row came first
    const row = await db.first<{ id: string; amount: number }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(row?.amount).toBe(1234);

    // The unknown-column message is recorded as pending...
    const pending = getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].dataset).toBe('transactions');
    expect(pending[0].column).toBe('brand_new_column');
    expect(pending[0].value).toBe('S:hello');

    // ...and both messages made it into the crdt log, so the merkle
    // stays in sync with other clients
    const crdt = db.runQuery<{ column: string }>(
      'SELECT * FROM messages_crdt',
      [],
      true,
    );
    expect(crdt.length).toBe(2);
  });

  it('does not defer local messages: unknown schema is a bug and must fail', async () => {
    await expect(
      applyMessages([
        {
          dataset: 'transactions',
          row: 't1',
          column: 'brand_new_column',
          value: 'hello',
          timestamp: sendTimestamp(),
        },
      ]),
    ).rejects.toMatchObject({ reason: 'invalid-schema' });

    expect(getPending().length).toBe(0);
  });

  it('defers messages for unknown tables without failing the batch', async () => {
    await applyMessages(
      [
        {
          dataset: 'gadgets',
          row: 'g1',
          column: 'name',
          value: 'flux capacitor',
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );

    expect(getPending().length).toBe(1);
  });

  it('replays pending messages once the schema catches up, last write wins', async () => {
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'brand_new_column',
          value: 'old value',
          timestamp: sendTimestamp(),
        },
        {
          dataset: 'transactions',
          row: 't1',
          column: 'amount',
          value: 1234,
          timestamp: sendTimestamp(),
        },
        {
          dataset: 'transactions',
          row: 't1',
          column: 'brand_new_column',
          value: 'new value',
          timestamp: sendTimestamp(),
        },
        {
          // A row that only ever got a deferred message; replay has to
          // create it
          dataset: 'transactions',
          row: 't2',
          column: 'brand_new_column',
          value: 'other row',
          timestamp: sendTimestamp(),
        },
        {
          dataset: 'gadgets',
          row: 'g1',
          column: 'name',
          value: 'flux capacitor',
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );
    // Repeated writes to the same cell coalesce to the newest value, so
    // t1's two brand_new_column messages leave one pending row
    const coalesced = getPending();
    expect(coalesced.length).toBe(3);
    expect(
      coalesced.find(p => p.row === 't1' && p.column === 'brand_new_column')
        ?.value,
    ).toBe('S:new value');

    // "Run the migration" that the newer client already has
    db.execQuery('ALTER TABLE transactions ADD COLUMN brand_new_column TEXT');
    replayPendingMessages();

    const t1 = await db.first<{ brand_new_column: string }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(t1?.brand_new_column).toBe('new value');

    const t2 = await db.first<{ brand_new_column: string }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t2'],
    );
    expect(t2?.brand_new_column).toBe('other row');

    // The message for the still-unknown table stays pending...
    let pending = getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].dataset).toBe('gadgets');

    // ...until a later upgrade adds it
    db.execQuery('CREATE TABLE gadgets (id TEXT PRIMARY KEY, name TEXT)');
    replayPendingMessages();

    const g1 = await db.first<{ name: string }>(
      'SELECT * FROM gadgets WHERE id = ?',
      ['g1'],
    );
    expect(g1?.name).toBe('flux capacitor');
    pending = getPending();
    expect(pending.length).toBe(0);
  });
});
