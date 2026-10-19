import 'fake-indexeddb/auto';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as idb from '#platform/server/indexeddb';
import {
  closeDatabase,
  execQuery,
  exportDatabase,
  init,
  openDatabase,
  runQuery,
} from '#platform/server/sqlite';

import { legacyDatabaseExists } from './absurd-migration';
import { BudgetInUseError } from './errors';
import { getSqliteFileRow, putSqliteFileRow } from './files-store';
import { applyFilePragmas, createOpfsStore, POOL_ROOT } from './opfs-sahpool';
import { legacyDatabaseName } from './paths';
import { readSqliteWasm, seedLegacyDatabase } from './test-helpers';

const noSleep = () => Promise.resolve();

async function makeDatabaseBytes(): Promise<Uint8Array> {
  const db = await openDatabase();
  execQuery(
    db,
    "CREATE TABLE __migrations__ (id INTEGER PRIMARY KEY); CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('x');",
  );
  const bytes = await exportDatabase(db);
  closeDatabase(db);
  return bytes;
}

const PATH = '/documents/Actual/budget-one/db.sqlite';

// A pool that keeps files in memory and records every call
function fakePool(files = new Map<string, Uint8Array>()) {
  let paused = false;
  const util = {
    vfsName: 'actual-test',
    files,
    getFileNames: vi.fn(() => [...files.keys()]),
    getFileCount: vi.fn(() => files.size),
    isPaused: vi.fn(() => paused),
    pauseVfs: vi.fn(() => {
      paused = true;
      return util;
    }),
    unpauseVfs: vi.fn(async () => {
      paused = false;
      return util;
    }),
    importDb: vi.fn(
      async (
        name: string,
        data: Uint8Array | (() => Promise<Uint8Array | undefined>),
      ) => {
        if (typeof data === 'function') {
          const chunks: Uint8Array[] = [];
          for (;;) {
            const chunk = await data();
            if (!chunk) break;
            chunks.push(chunk);
          }
          const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const bytes = new Uint8Array(total);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          files.set(name, bytes);
          return bytes.length;
        }
        files.set(name, data);
        return data.length;
      },
    ),
    exportFile: vi.fn((name: string) => {
      const bytes = files.get(name);
      if (!bytes) throw new Error('no such file ' + name);
      return bytes;
    }),
    unlink: vi.fn((name: string) => files.delete(name)),
    wipeFiles: vi.fn(async () => files.clear()),
    removeVfs: vi.fn(async () => true),
  };
  return util;
}

// The pieces of sqlite3 the store touches. Databases opened "in the pool"
// are real in-memory databases loaded from the fake pool's bytes.
function fakeSqlite3(
  pool: ReturnType<typeof fakePool>,
  { version = 3054000, failInstalls = 0 } = {},
) {
  let installs = 0;
  const execLog: string[] = [];
  class FakeDB {
    name: string;
    constructor(options: { filename: string; flags: string; vfs: string }) {
      this.name = options.filename;
      if (!pool.files.has(options.filename) && !options.flags.includes('c')) {
        throw new Error('SQLITE_CANTOPEN');
      }
    }
    exec(sql: string) {
      execLog.push(sql);
    }
    selectValue(sql: string) {
      if (sql.includes('quick_check')) return 'ok';
      return 1;
    }
    close() {
      // Nothing to release in the fake
    }
  }
  const api = {
    version: { libVersion: String(version), libVersionNumber: version },
    installOpfsSAHPoolVfs: vi.fn(async () => {
      installs++;
      if (installs <= failInstalls) {
        throw new Error('NoModificationAllowedError: handles are locked');
      }
      return pool;
    }),
    oo1: { DB: FakeDB },
    execLog,
  };
  return api as unknown as Sqlite3Static & { execLog: string[] };
}

function neverLock() {
  const error = new Error('timed out');
  error.name = 'AbortError';
  return () => Promise.reject(error);
}

function trackingLock() {
  const releases: string[] = [];
  const acquire = vi.fn(async (name: string) => () => {
    releases.push(name);
  });
  return { acquire, releases };
}

beforeAll(() => init({ storage: 'memory-idb', wasmBinary: readSqliteWasm() }));

beforeEach(async () => {
  global.indexedDB = new IDBFactory();
  await idb.closeDatabase();
  void idb.openDatabase();
});

describe('OPFS pool store', () => {
  it('installs each budget pool with the data-preserving options', async () => {
    const pool = fakePool();
    const sqlite3 = fakeSqlite3(pool);
    const { acquire } = trackingLock();
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: acquire,
      sleep: noSleep,
    });

    await store.open(PATH);
    expect(sqlite3.installOpfsSAHPoolVfs).toHaveBeenCalledTimes(1);
    expect(sqlite3.installOpfsSAHPoolVfs).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'actual-documents-Actual-budget-one',
        directory: `${POOL_ROOT}/documents-Actual-budget-one`,
        preserveOnInitFailure: true,
        forceReinitIfPreviouslyFailed: false,
        clearOnInit: false,
      }),
    );
    expect(acquire).toHaveBeenCalledWith(
      'actual-budget:documents-Actual-budget-one',
      expect.any(Number),
    );
    expect(sqlite3.execLog.join('\n')).toMatch(/locking_mode=EXCLUSIVE/);
    expect(sqlite3.execLog.join('\n')).toMatch(/journal_mode=TRUNCATE/);
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
  });

  it('retries a failed install and only then forces a re-init', async () => {
    const pool = fakePool();
    const sqlite3 = fakeSqlite3(pool, { failInstalls: 2 });
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    await store.open(PATH);
    const calls = (sqlite3.installOpfsSAHPoolVfs as ReturnType<typeof vi.fn>)
      .mock.calls;
    expect(calls.length).toBe(3);
    expect(calls[0][0].forceReinitIfPreviouslyFailed).toBe(false);
    expect(calls[1][0].forceReinitIfPreviouslyFailed).toBe(true);
  });

  it('reports a budget in use when the lock cannot be taken', async () => {
    const sqlite3 = fakeSqlite3(fakePool());
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: neverLock(),
      sleep: noSleep,
    });
    await expect(store.open(PATH)).rejects.toBeInstanceOf(BudgetInUseError);
    expect(sqlite3.installOpfsSAHPoolVfs).not.toHaveBeenCalled();
  });

  it('refuses sqlite builds that would wipe a pool on a failed install', async () => {
    const sqlite3 = fakeSqlite3(fakePool(), { version: 3053004 });
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    await expect(store.open(PATH)).rejects.toThrow(/too old/);
  });

  it('pauses the pool and releases the lock when the last database closes', async () => {
    const pool = fakePool();
    const sqlite3 = fakeSqlite3(pool);
    const { acquire, releases } = trackingLock();
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: acquire,
      sleep: noSleep,
    });

    const db = await store.open(PATH);
    expect(releases).toEqual([]);
    store.close(PATH, db);
    expect(pool.pauseVfs).toHaveBeenCalledTimes(1);
    expect(releases).toEqual(['actual-budget:documents-Actual-budget-one']);

    // Reopening reuses the installed pool
    await store.open(PATH);
    expect(pool.unpauseVfs).toHaveBeenCalledTimes(1);
    expect(sqlite3.installOpfsSAHPoolVfs).toHaveBeenCalledTimes(1);
  });

  it('deletes with unlink and wipeFiles, never removeVfs', async () => {
    const pool = fakePool(
      new Map([
        ['/db.sqlite', new Uint8Array([1])],
        ['/db.sqlite-journal', new Uint8Array([2])],
      ]),
    );
    const sqlite3 = fakeSqlite3(pool);
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    await store.writeFile(
      '/documents/Actual/other/db.sqlite',
      new Uint8Array([9]),
    );
    await store.removeFile(PATH);
    expect(pool.unlink).toHaveBeenCalledWith('/db.sqlite');
    expect(pool.unlink).toHaveBeenCalledWith('/db.sqlite-journal');
    expect(pool.removeVfs).not.toHaveBeenCalled();
    expect(pool.pauseVfs).toHaveBeenCalled();
  });

  it('imports an absurd-sql database into the pool and verifies it', async () => {
    const source = await openDatabase();
    execQuery(
      source,
      'CREATE TABLE __migrations__ (id INTEGER PRIMARY KEY); CREATE TABLE t (v TEXT);',
    );
    runQuery(source, "INSERT INTO t (v) VALUES ('legacy')");
    const bytes = await exportDatabase(source);
    closeDatabase(source);
    const name = legacyDatabaseName(PATH);
    await seedLegacyDatabase(name, bytes);

    const pool = fakePool();
    const sqlite3 = fakeSqlite3(pool);
    const phases: string[] = [];
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
      onMigrationProgress: phase => phases.push(phase),
    });

    await store.open(PATH);
    const imported = pool.files.get('/db.sqlite');
    expect(imported && Buffer.from(imported).equals(Buffer.from(bytes))).toBe(
      true,
    );
    expect(phases).toEqual(
      expect.arrayContaining(['copy', 'verify', 'cleanup', 'done']),
    );
    expect(await legacyDatabaseExists(name)).toBe(false);
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
  });

  it('applies the file pragmas to a real database', async () => {
    // Memory databases accept the same pragmas; this guards the SQL text
    const db = await openDatabase();
    expect(() => applyFilePragmas(db as never)).not.toThrow();
    closeDatabase(db);
  });

  it('promotes a database the IndexedDB fallback kept into the pool', async () => {
    const bytes = await makeDatabaseBytes();
    await putSqliteFileRow({
      filepath: PATH,
      contents: bytes,
      storage: 'memory-idb',
      rev: 3,
    });
    const pool = fakePool();
    const sqlite3 = fakeSqlite3(pool);
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    await store.open(PATH, { create: false });
    expect(pool.importDb).toHaveBeenCalledTimes(1);
    expect(pool.files.get('/db.sqlite')?.byteLength).toBe(bytes.byteLength);
    const row = await getSqliteFileRow(PATH);
    expect(row?.storage).toBe('opfs');
    expect(row?.contents).toBe('');
    expect(row?.rev).toBe(3);
  });

  it('does not treat an empty fallback row as data to promote', async () => {
    await putSqliteFileRow({
      filepath: PATH,
      contents: new Uint8Array(0),
      storage: 'memory-idb',
    });
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    await expect(store.open(PATH, { create: false })).rejects.toThrow(
      /does not exist/,
    );
    expect(pool.importDb).not.toHaveBeenCalled();
  });
});
