import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Database } from './types';

import {
  closeDatabase,
  execQuery,
  exportDatabase,
  init,
  openDatabase,
  prepare,
  runQuery,
  transaction,
} from './index';

const require = createRequire(import.meta.url);

beforeAll(() => {
  // No fetch in tests: hand the engine the wasm bytes directly
  const wasmBinary = readFileSync(
    require.resolve('@sqlite.org/sqlite-wasm/sqlite3.wasm'),
  );
  return init({ storage: 'memory-idb', wasmBinary });
});

const initSQL = `
CREATE TABLE numbers (id TEXT PRIMARY KEY, number INTEGER);
CREATE TABLE textstrings (id TEXT PRIMARY KEY, string TEXT);
`;

type NumberRow = { id: string; number: number };

async function openWithSchema(): Promise<Database> {
  const db = await openDatabase();
  execQuery(db, initSQL);
  return db;
}

function expectConstraintFailure(fn: () => void) {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => null);
  expect(fn).toThrow(/constraint failed/i);
  consoleSpy.mockRestore();
}

describe('sqlite-wasm engine', () => {
  it('runs statements and reports changes', async () => {
    const db = await openWithSchema();

    expect(
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)"),
    ).toEqual({ changes: 1 });
    expect(
      runQuery(db, 'UPDATE numbers SET number = ? WHERE id = ?', [5, 'id1']),
    ).toEqual({ changes: 1 });
    expect(
      runQuery(db, 'DELETE FROM numbers WHERE id = ?', ['missing']),
    ).toEqual({ changes: 0 });

    const rows = runQuery<NumberRow>(db, 'SELECT * FROM numbers', [], true);
    expect(rows).toEqual([{ id: 'id1', number: 5 }]);
    closeDatabase(db);
  });

  it('rolls back a failed transaction', async () => {
    const db = await openWithSchema();
    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)");

    expectConstraintFailure(() => {
      transaction(db, () => {
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id2', 5)");
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id3', 6)");
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
      });
    });

    const rows = runQuery<NumberRow>(db, 'SELECT * FROM numbers', [], true);
    expect(rows).toEqual([{ id: 'id1', number: 4 }]);
    closeDatabase(db);
  });

  it('turns nested transactions into savepoints', async () => {
    const db = await openWithSchema();
    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)");

    transaction(db, () => {
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id2', 5)");
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id3', 6)");

      // Only the inner transaction should fail
      expectConstraintFailure(() => {
        transaction(db, () => {
          runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id4', 7)");
          runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
        });
      });
    });

    const rows = runQuery<NumberRow>(db, 'SELECT * FROM numbers', [], true);
    expect(rows.map(row => row.number)).toEqual([4, 5, 6]);
    closeDatabase(db);
  });

  it('supports immediate transactions with rollback and nesting', async () => {
    const db = await openWithSchema();

    transaction(
      db,
      () => {
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
        transaction(
          db,
          () => {
            runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id2', 2)");
          },
          { immediate: true },
        );
      },
      { immediate: true },
    );
    expect(runQuery(db, 'SELECT * FROM numbers', [], true).length).toBe(2);

    expectConstraintFailure(() => {
      transaction(
        db,
        () => {
          runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id3', 3)");
          runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
        },
        { immediate: true },
      );
    });

    expect(runQuery(db, 'SELECT * FROM numbers', [], true).length).toBe(2);
    // The failed transaction must have released the write lock
    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id4', 4)");
    expect(runQuery(db, 'SELECT * FROM numbers', [], true).length).toBe(3);
    closeDatabase(db);
  });

  it('reuses prepared statements across calls', async () => {
    const db = await openWithSchema();
    const insert = prepare(
      db,
      'INSERT INTO numbers (id, number) VALUES (?, ?)',
    );

    runQuery(db, insert, ['id1', 1]);
    runQuery(db, insert, ['id2', 2]);
    expectConstraintFailure(() => runQuery(db, insert, ['id1', 3]));
    // Still usable after a failure
    runQuery(db, insert, ['id3', 3]);

    const select = prepare(db, 'SELECT number FROM numbers WHERE id = ?');
    expect(runQuery(db, select, ['id2'], true)).toEqual([{ number: 2 }]);
    expect(runQuery(db, select, ['id3'], true)).toEqual([{ number: 3 }]);
    closeDatabase(db);
  });

  it('frees the statements it prepares', async () => {
    const db = await openWithSchema();
    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)");
    runQuery(db, 'SELECT * FROM numbers', [], true);
    expectConstraintFailure(() =>
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 5)"),
    );

    const openStatements = (
      db as unknown as { openStatementCount: () => number }
    ).openStatementCount();
    expect(openStatements).toBe(0);
    closeDatabase(db);
  });

  it('uses the crdt index for a batched cell lookup', async () => {
    // Mirrors the query `compareMessages` in server/sync builds for a
    // full chunk. If the planner ever falls back to a table scan, bulk
    // edits get slow again.
    const db = await openDatabase();
    execQuery(
      db,
      `
      CREATE TABLE messages_crdt (
        id INTEGER PRIMARY KEY,
        timestamp TEXT NOT NULL UNIQUE,
        dataset TEXT NOT NULL,
        row TEXT NOT NULL,
        column TEXT NOT NULL,
        value BLOB NOT NULL
      );
      CREATE INDEX messages_crdt_search ON messages_crdt(dataset, row, column, timestamp);
      `,
    );

    const termCount = 100;
    const term = '(dataset = ? AND row = ? AND column = ? AND timestamp >= ?)';
    const sql =
      'SELECT dataset, row, column, timestamp FROM messages_crdt WHERE ' +
      Array(termCount).fill(term).join(' OR ');
    const params = Array.from({ length: termCount }, (_, index) => [
      'transactions',
      `row${index}`,
      'amount',
      '2024-01-01T00:00:00.000Z-0000-0000000000000000',
    ]).flat();

    const plan = runQuery<{ detail: string }>(
      db,
      'EXPLAIN QUERY PLAN ' + sql,
      params,
      true,
    );
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.some(step => step.detail.includes('SCAN'))).toBe(false);
    expect(
      plan.some(step => step.detail.includes('messages_crdt_search')),
    ).toBe(true);
    expect(runQuery(db, sql, params, true)).toEqual([]);
    closeDatabase(db);
  });

  it('provides the unicode and regexp functions', async () => {
    const db = await openWithSchema();
    runQuery(
      db,
      "INSERT INTO textstrings (id, string) VALUES ('id1', 'not empty string')",
    );
    runQuery(
      db,
      "INSERT INTO textstrings (id, string) VALUES ('id2', 'ÉCOLE')",
    );
    runQuery(db, "INSERT INTO textstrings (id) VALUES ('id3')");

    expect(
      runQuery(
        db,
        "SELECT id FROM textstrings WHERE REGEXP('n.', string)",
        [],
        true,
      ),
    ).toEqual([{ id: 'id1' }]);
    for (const pattern of ['\\', 'asdf\\', '[']) {
      expect(
        runQuery(
          db,
          'SELECT id FROM textstrings WHERE REGEXP(?, string)',
          [pattern],
          true,
        ),
      ).toEqual([]);
    }

    expect(
      runQuery(
        db,
        "SELECT UNICODE_LOWER(string) AS lower FROM textstrings WHERE id = 'id2'",
        [],
        true,
      ),
    ).toEqual([{ lower: 'école' }]);
    expect(
      runQuery(db, "SELECT UNICODE_UPPER('straße') AS upper", [], true),
    ).toEqual([{ upper: 'STRASSE' }]);
    expect(
      runQuery(
        db,
        "SELECT id FROM textstrings WHERE UNICODE_LIKE('%école%', string)",
        [],
        true,
      ),
    ).toEqual([{ id: 'id2' }]);
    expect(
      runQuery(db, "SELECT NORMALISE('Café') AS normalised", [], true),
    ).toEqual([{ normalised: 'cafe' }]);
    // NULL in, NULL out (never undefined)
    expect(
      runQuery(
        db,
        "SELECT UNICODE_LOWER(string) AS lower, NORMALISE(string) AS normalised FROM textstrings WHERE id = 'id3'",
        [],
        true,
      ),
    ).toEqual([{ lower: null, normalised: null }]);
    closeDatabase(db);
  });

  it('round-trips a database through export and import', async () => {
    const db = await openWithSchema();
    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 42)");
    runQuery(db, 'INSERT INTO textstrings (id, string) VALUES (?, ?)', [
      'id1',
      'blob-free',
    ]);

    const bytes = await exportDatabase(db);
    closeDatabase(db);
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(new TextDecoder().decode(bytes.slice(0, 15))).toBe(
      'SQLite format 3',
    );

    const copy = await openDatabase(bytes);
    expect(
      runQuery<NumberRow>(copy, 'SELECT * FROM numbers', [], true),
    ).toEqual([{ id: 'id1', number: 42 }]);
    // Writable after import, and the functions are installed
    runQuery(copy, "INSERT INTO numbers (id, number) VALUES ('id2', 1)");
    expect(
      runQuery(copy, "SELECT UNICODE_UPPER('ok') AS upper", [], true),
    ).toEqual([{ upper: 'OK' }]);
    closeDatabase(copy);
  });

  it('rejects bytes that are not a database', async () => {
    // Depending on the build the failure surfaces when the bytes are
    // loaded or on the first read, so cover both
    await expect(
      (async () => {
        const db = await openDatabase(
          new TextEncoder().encode('definitely not a database file'),
        );
        try {
          runQuery(db, 'SELECT name FROM sqlite_master', [], true);
        } finally {
          closeDatabase(db);
        }
      })(),
    ).rejects.toThrow(/deserialize|not a database/i);
  });
});
