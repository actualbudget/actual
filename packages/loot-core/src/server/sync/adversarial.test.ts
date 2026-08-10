// Adversarial regression tests for PR #8519 (cross-version sync:
// deferred messages). NOT part of the PR — written to try to break the
// implementation during review. Updated for the hardened revision
// (per-message replay outcomes, quoteSqlId, unknown-format values,
// stale-pending cleanup, dropped-message flow).
import { getClock, Timestamp } from '@actual-app/crdt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import {
  getMigrationsDir,
  migrate,
  withMigrationsDir,
} from '#server/migrate/migrations';

import { rebuildMerkleHash } from './repair';
import { replayPendingMessages } from './replay';
import { deserializeValueSafe } from './serialization';

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
        {
          // Unknown value format for an existing column
          dataset: 'transactions',
          row: 't1',
          column: 'notes',
          value: deserializeValueSafe('B:true'),
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );

    const rebuilt = rebuildMerkleHash();
    expect(rebuilt.numMessages).toBe(4);
    expect(rebuilt.trie.hash).toBe(getClock().merkle.hash);
  });

  it('out-of-order arrival: an older deferred message cannot clobber a newer pending value', async () => {
    const tsOld = sendTimestamp();
    const tsNew = sendTimestamp();

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

  it('defers messages whose dataset/column are SQL keywords or contain spaces (quoteSqlId)', async () => {
    await applyMessages(
      [
        {
          // SQL keyword as a column name on an existing table
          dataset: 'transactions',
          row: 't1',
          column: 'order',
          value: 'x',
          timestamp: sendTimestamp(),
        },
        {
          // Identifier with a space — must be treated as an unknown
          // table, not a syntax error that fails the batch
          dataset: 'transactions x',
          row: 't1',
          column: 'amount',
          value: 1,
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );
    expect(getPending().length).toBe(2);
  });

  it('quote-escaping prevents identifier injection through column names', async () => {
    const evil = 'a" , "b';
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: evil,
          value: 'x',
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );
    // Deferred (unknown column), and replay keeps it pending — never
    // interpreted as extra SQL
    expect(getPending().length).toBe(1);
    replayPendingMessages();
    const pending = getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].column).toBe(evil);
  });

  it('poisoned pending message is dropped without blocking valid replays', async () => {
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

    // Must not throw; the CHECK-violating message is dropped, the valid
    // one applies
    replayPendingMessages();

    const t1 = await db.first<{ future_col: string | null }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(t1?.future_col).toBe('good');
    expect(getPending().length).toBe(0);
    const c1 = await db.first<{ id: string } | null>(
      'SELECT * FROM checked_table WHERE id = ?',
      ['c1'],
    );
    expect(c1).toBeNull();
  });

  it('unknown-format value for an existing column defers, and a newer plain write supersedes it', async () => {
    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'notes',
          value: deserializeValueSafe('B:true'),
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );
    expect(getPending().length).toBe(1);

    await applyMessages(
      [
        {
          dataset: 'transactions',
          row: 't1',
          column: 'notes',
          value: 'plain newer value',
          timestamp: sendTimestamp(),
        },
      ],
      true,
    );

    // Replay must discard the stale pending value instead of applying it
    replayPendingMessages();
    const t1 = await db.first<{ notes: string }>(
      'SELECT * FROM transactions WHERE id = ?',
      ['t1'],
    );
    expect(t1?.notes).toBe('plain newer value');
    expect(getPending().length).toBe(0);
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
    const crdt = db.runQuery('SELECT * FROM messages_crdt', [], true);
    expect(crdt.length).toBe(0);
  });

  it('rejects an unknown pre-cutoff migration id (corruption, not a newer version)', async () => {
    // 1600000000000 is far below ADDITIVE_ONLY_CUTOFF and unknown
    db.runQuery('INSERT INTO __migrations__ (id) VALUES (1600000000000)');
    await withMigrationsDir(getMigrationsDir(), async () => {
      await expect(migrate(db.getDatabase())).rejects.toThrow(
        'out-of-sync-migrations',
      );
    });
  });

  it('tolerates an unknown post-cutoff migration id on the real migration chain', async () => {
    db.runQuery('INSERT INTO __migrations__ (id) VALUES (9999999999999)');
    await withMigrationsDir(getMigrationsDir(), async () => {
      // Must not throw
      await migrate(db.getDatabase());
    });
  });
});
