import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { patchFetchForSqlJS } from '#mocks/util';
import * as connection from '#platform/server/connection';

import * as storage from './storage';
import { BudgetInUseError, StorageUnavailableError } from './storage/errors';
import { putSqliteFileRow } from './storage/files-store';
import {
  initWasmEngine,
  readSqliteWasm,
  resetIndexedDb,
} from './storage/test-helpers';
import type { Database, Statement } from './types';

import {
  closeDatabase,
  execQuery,
  exportDatabase,
  init,
  openDatabase,
  prepare,
  releaseSqliteStorage,
  resumeSqliteStorage,
  runQuery,
  transaction,
} from './index';

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

// Satisfies the OPFS probe of `detectOpfsSyncAccess`, which jsdom cannot,
// for the duration of `run`. Once the browser has dropped its index of the
// private file system, lookups that create nothing fail.
async function withOpfsSyncAccess(
  run: () => Promise<void>,
  isIndexDropped: () => boolean = () => false,
): Promise<void> {
  const directory = {
    getFileHandle: async () => ({
      createSyncAccessHandle: async () => ({ close: () => undefined }),
    }),
    removeEntry: async () => undefined,
  };
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      getDirectory: async () => ({
        getDirectoryHandle: async (
          _name: string,
          options?: { create?: boolean },
        ) => {
          if (!options?.create && isIndexDropped()) {
            throw new DOMException('could not be found', 'NotFoundError');
          }
          return directory;
        },
      }),
    },
  });
  try {
    await run();
  } finally {
    Reflect.deleteProperty(navigator, 'storage');
  }
}

// The same contract is expected of both web engines; each describe block
// below switches the facade to one of them.
function itBehavesLikeSqlite() {
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
        // Nested transactions become savepoints regardless of the mode
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
    // And the query itself runs within the parameter limits
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
    // An invalid pattern matches nothing instead of failing the query
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

    const bytes = await exportDatabase(db);
    closeDatabase(db);
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
}

describe('legacy sql.js engine', () => {
  beforeAll(() => {
    const baseURL = `${__dirname}/../../../../../../node_modules/@jlongster/sql.js/dist/`;
    patchFetchForSqlJS(baseURL);
    return init({ baseURL });
  });

  itBehavesLikeSqlite();

  it('releases the shared budget lock when the open fails', async () => {
    let released = false;
    const request = vi.fn(
      (_name: string, _options: unknown, callback: () => Promise<void>) =>
        callback().then(() => {
          released = true;
        }),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    try {
      // No such file in the legacy filesystem, so the open fails after
      // the lock was taken
      await expect(
        openDatabase('/documents/Actual/missing/db.sqlite'),
      ).rejects.toThrow();
      await vi.waitFor(() => expect(released).toBe(true));
    } finally {
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        configurable: true,
      });
    }
  });

  it('shares the budget lock and reports a budget in use when it is held', async () => {
    // A fake Web Locks API that times out, as it does while another
    // worker holds the budget exclusively
    const request = vi.fn(() =>
      Promise.reject(new DOMException('aborted', 'AbortError')),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    try {
      await expect(
        openDatabase('/documents/Actual/budget-one/db.sqlite'),
      ).rejects.toBeInstanceOf(BudgetInUseError);
      expect(request).toHaveBeenCalledWith(
        'actual-budget:documents-Actual-budget-one',
        expect.objectContaining({ mode: 'shared' }),
        expect.any(Function),
      );
    } finally {
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        configurable: true,
      });
    }
  });

  it('refuses a budget that moved to the new storage while it waited', async () => {
    const path = '/documents/Actual/moved/db.sqlite';
    await putSqliteFileRow({ filepath: path, contents: '', storage: 'opfs' });
    await expect(openDatabase(path)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
  });

  it('frees the statements it prepares', async () => {
    const db = await openWithSchema();
    // The facade hands out an opaque handle; the legacy engine's statements
    // are plain sql.js objects underneath
    const prepareSpy = vi.spyOn(
      db as unknown as { prepare: (sql: string) => { run: () => void } },
      'prepare',
    );

    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)");
    runQuery(db, 'SELECT * FROM numbers', [], true);
    expectConstraintFailure(() =>
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 5)"),
    );

    expect(prepareSpy).toHaveBeenCalledTimes(3);
    for (const { value: statement } of prepareSpy.mock.results) {
      expect(() => statement.run()).toThrow(/Statement closed/);
    }
    closeDatabase(db);
  });
});

describe('sqlite-wasm engine', () => {
  beforeAll(() => initWasmEngine());

  itBehavesLikeSqlite();

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

  it('does not log a warning when a statement fails', async () => {
    const db = await openWithSchema();
    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => null);
    try {
      expectConstraintFailure(() =>
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 2)"),
      );
      // The oo1 API warns before it throws; sync applies messages as
      // insert-then-update, so that would flood the console
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
    closeDatabase(db);
  });

  it('logs the text of a failed read, and nothing for a failed write', async () => {
    const db = await openWithSchema();
    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
    const log = vi.spyOn(console, 'log').mockImplementation(() => null);
    try {
      expect(() =>
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 2)"),
      ).toThrow(/constraint failed/i);
      expect(log).not.toHaveBeenCalled();

      // Fails when stepped rather than prepared, so it can be cached
      const statement = prepare(db, 'SELECT abs(-9223372036854775808)');
      expect(() => runQuery(db, statement, [], true)).toThrow(/overflow/i);
      expect(log).toHaveBeenCalledWith('SELECT abs(-9223372036854775808)');
    } finally {
      log.mockRestore();
    }
    closeDatabase(db);
  });

  it('has the storage looked at when a statement fails with an I/O error', async () => {
    const db = await openWithSchema();
    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
    const check = vi
      .spyOn(storage, 'checkStorageAfterIoError')
      .mockImplementation(() => undefined);
    try {
      // A routine failure is none of the storage's business
      expectConstraintFailure(() =>
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 2)"),
      );
      expect(check).not.toHaveBeenCalled();

      // SQLITE_IOERR_WRITE, what a write gets once the browser has dropped
      // the file under an open database
      const ioError = Object.assign(new Error('disk I/O error'), {
        resultCode: 778,
      });
      const failing = {
        step: () => {
          throw ioError;
        },
        reset: () => undefined,
      };
      expect(() =>
        runQuery(db, failing as unknown as Statement, [], false),
      ).toThrow(ioError);
      expect(check).toHaveBeenCalledTimes(1);

      const exec = vi
        .spyOn(db as unknown as { exec: (sql: string) => void }, 'exec')
        .mockImplementation(() => {
          throw ioError;
        });
      expect(() => execQuery(db, 'BEGIN')).toThrow(ioError);
      exec.mockRestore();
      expect(check).toHaveBeenCalledTimes(2);
    } finally {
      check.mockRestore();
    }
    closeDatabase(db);
  });

  it('tells the client when the browser drops the private file system', async () => {
    const wasmBinary = readSqliteWasm();
    const send = vi
      .spyOn(connection, 'send')
      .mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => null);
    let isIndexDropped = false;
    try {
      await withOpfsSyncAccess(
        async () => {
          await resetIndexedDb();
          expect(await init({ storage: 'opfs', wasmBinary })).toBe('opfs');

          // An I/O error with the files still there says nothing
          storage.checkStorageAfterIoError();
          await new Promise(resolve => setTimeout(resolve, 10));
          expect(send).not.toHaveBeenCalledWith('storage-lost');

          isIndexDropped = true;
          storage.checkStorageAfterIoError();
          await vi.waitFor(() =>
            expect(send).toHaveBeenCalledWith('storage-lost'),
          );
        },
        () => isIndexDropped,
      );
    } finally {
      send.mockRestore();
      error.mockRestore();
      await initWasmEngine();
    }
  });

  it('opens no stored database once the storage is let go, until it is resumed', async () => {
    await resetIndexedDb();
    await initWasmEngine();
    const path = '/documents/Actual/let-go/db.sqlite';
    try {
      await releaseSqliteStorage();
      await expect(openDatabase(path)).rejects.toBeInstanceOf(
        StorageUnavailableError,
      );
      // A database in memory holds no storage
      closeDatabase(await openDatabase());

      resumeSqliteStorage();
      closeDatabase(await openDatabase(path));
      // The new file's first save, so that it does not outlast the test
      await storage.getSqliteStore().flush();
    } finally {
      await initWasmEngine();
    }
  });

  it('gives back a database that was still being opened when the storage was let go', async () => {
    await resetIndexedDb();
    await initWasmEngine();
    let heldLocks = 0;
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (
          _name: string,
          _options: unknown,
          hold: () => Promise<void>,
        ) => {
          heldLocks += 1;
          return hold().then(() => {
            heldLocks -= 1;
          });
        },
      },
    });
    try {
      const opening = openDatabase('/documents/Actual/on-its-way/db.sqlite');
      await releaseSqliteStorage();
      // Under way, with the budget's lock already taken
      expect(heldLocks).toBe(1);
      await expect(opening).rejects.toBeInstanceOf(StorageUnavailableError);
      await vi.waitFor(() => expect(heldLocks).toBe(0));
    } finally {
      Reflect.deleteProperty(navigator, 'locks');
      await initWasmEngine();
    }
  });

  it('asks for OPFS when a fallback request meets data held in OPFS', async () => {
    const wasmBinary = readSqliteWasm();
    try {
      await withOpfsSyncAccess(async () => {
        await resetIndexedDb();
        await putSqliteFileRow({
          filepath: '/documents/Actual/a/db.sqlite',
          contents: new Uint8Array(0),
          storage: 'memory-idb',
        });
        expect(await init({ storage: 'memory-idb', wasmBinary })).toBe(
          'memory-idb',
        );
        await putSqliteFileRow({
          filepath: '/documents/Actual/b/db.sqlite',
          contents: '',
          storage: 'opfs',
        });
        expect(await init({ storage: 'memory-idb', wasmBinary })).toBe('opfs');
        expect(await init({ storage: 'legacy', wasmBinary })).toBe('opfs');
      });
    } finally {
      await initWasmEngine();
    }
  });
});
