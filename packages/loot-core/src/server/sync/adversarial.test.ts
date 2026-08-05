// Adversarial regression tests for PR #8519 (cross-version sync:
// deferred messages). NOT part of the PR — written to try to break the
// implementation during review.
import { getClock, Timestamp } from '@actual-app/crdt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';

import { rebuildMerkleHash } from './repair';
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

describe('adversarial: deferred sync messages', () => {
  it('keeps the merkle trie consistent with messages_crdt after deferrals', async () => {
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'future_col',
          value: 'x',
          timestamp: sendTimestamp(),
        },
        {
          dataset: 'transactions',
          row: 't1',
          column: 'amount',
          value: 100,
          timestamp: sendTimestamp(),
        },
        {
          dataset: 'unknown_table',
          row: 'u1',
          column: 'name',
          value: 'y',
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );

    const rebuilt = rebuildMerkleHash();
    expect(rebuilt.numMessages).toBe(3);
    expect(rebuilt.trie.hash).toBe(getClock().merkle.hash);
  });

  it('out-of-order arrival: an older deferred message cannot clobber a newer pending value', async () => {
    const tsOld = sendTimestamp();
    const tsNew = sendTimestamp();

    // Newer message arrives first (separate batch)
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'future_col',
          value: 'newer',
          timestamp: tsNew,
        },
      ],
      true,
    );
    // Older message arrives later
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'future_col',
          value: 'older',
          timestamp: tsOld,
        },
      ],
      true,
    );

    const pending = getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].value).toBe('S:newer');
  });

  it('receiving the exact same message twice does not duplicate crdt or pending rows', async () => {
    const ts = sendTimestamp();
    const msg = {
      dataset: 'transactions',
      row: 't1',
      column: 'future_col',
      value: 'x',
      timestamp: ts,
    };

    await applyMessages([msg], true);
    await applyMessages([{ ...msg }], true);

    const crdt = db.runQuery<{ timestamp: string }>(
      'SELECT * FROM messages_crdt',
      [],
      true,
    );
    expect(crdt.length).toBe(1);
    expect(getPending().length).toBe(1);
  });

  it('replay is idempotent and a replayed value survives older late-arriving messages', async () => {
    const tsOld = sendTimestamp();
    const tsNew = sendTimestamp();

    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'future_col',
          value: 'winner',
          timestamp: tsNew,
        },
      ],
      true,
    );

    db.execQuery('ALTER TABLE transactions ADD COLUMN future_col TEXT');
    replayPendingMessages();
    replayPendingMessages(); // idempotent, nothing pending anymore
    expect(getPending().length).toBe(0);

    let row = await db.first<{ future_col: string }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(row?.future_col).toBe('winner');

    // An older message for the same cell arrives after the upgrade. The
    // crdt entry recorded at deferral time must mark it old so it can't
    // clobber the replayed value.
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'future_col',
          value: 'stale',
          timestamp: tsOld,
        },
      ],
      true,
    );
    row = await db.first<{ future_col: string }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(row?.future_col).toBe('winner');
  });

  it('round-trips numbers and nulls through the pending table', async () => {
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'future_num',
          value: 12.5,
          timestamp: sendTimestamp(),
        },
        {
          dataset: 'transactions',
          row: 't2',
          column: 'future_null',
          value: null,
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );

    db.execQuery('ALTER TABLE transactions ADD COLUMN future_num REAL');
    db.execQuery('ALTER TABLE transactions ADD COLUMN future_null TEXT');
    replayPendingMessages();

    const t1 = await db.first<{ future_num: number }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(t1?.future_num).toBe(12.5);
    const t2 = await db.first<{ future_null: string | null }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t2'],
    );
    expect(t2?.future_null).toBeNull();
    expect(getPending().length).toBe(0);
  });

  it('replay can insert into a table with NOT NULL DEFAULT columns', async () => {
    await applyMessages(
      [
        {
          dataset: 'gadgets',
          row: 'g1',
          column: 'name',
          value: 'flux',
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );

    db.execQuery(
      'CREATE TABLE gadgets (id TEXT PRIMARY KEY, name TEXT, size INTEGER NOT NULL DEFAULT 0)',
    );
    replayPendingMessages();

    const g1 = await db.first<{ name: string; size: number }>(
      'SELECT * FROM gadgets WHERE id = ?',
      ['g1'],
    );
    expect(g1?.name).toBe('flux');
    expect(g1?.size).toBe(0);
    expect(getPending().length).toBe(0);
  });

  it('does NOT defer non-schema errors (syntax errors still fail the batch)', async () => {
    await expect(
      applyMessages(
        [
          {
            dataset: 'transactions x',
            row: 't1',
            column: 'amount',
            value: 1,
            timestamp: sendTimestamp(),
          },
        ],
        true,
      ),
    ).rejects.toMatchObject({ reason: 'invalid-schema' });
    expect(getPending().length).toBe(0);
  });

  it('documents blast radius: one poisoned pending message rolls back the whole replay', async () => {
    // A valid deferral and a poisoned one (violates a CHECK constraint
    // once the table exists)
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'future_col',
          value: 'good',
          timestamp: sendTimestamp(),
        },
        {
          dataset: 'checked_table',
          row: 'c1',
          column: 'amount',
          value: -5,
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );
    expect(getPending().length).toBe(2);

    db.execQuery('ALTER TABLE transactions ADD COLUMN future_col TEXT');
    db.execQuery(
      'CREATE TABLE checked_table (id TEXT PRIMARY KEY, amount INTEGER CHECK(amount >= 0))',
    );

    expect(() => replayPendingMessages()).toThrow();

    // The whole transaction rolled back: even the valid message was not
    // applied and stays pending
    const t1 = await db.first<{ future_col: string | null }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(t1?.future_col ?? null).toBeNull();
    expect(getPending().length).toBe(2);
  });

  it('local messages (no defer flag) still fail loudly on unknown schema', async () => {
    await expect(
      applyMessages([
        {
          dataset: 'transactions',
          row: 't1',
          column: 'future_col',
          value: 'x',
          timestamp: sendTimestamp(),
        },
      ]),
    ).rejects.toMatchObject({ reason: 'invalid-schema' });
    expect(getPending().length).toBe(0);
    // and nothing leaked into the crdt log
    const crdt = db.runQuery('SELECT * FROM messages_crdt', [], true);
    expect(crdt.length).toBe(0);
  });
});
