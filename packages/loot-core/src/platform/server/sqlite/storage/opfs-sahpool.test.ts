import 'fake-indexeddb/auto';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as idb from '#platform/server/indexeddb';
import {
  closeDatabase,
  execQuery,
  exportDatabase,
  openDatabase,
  runQuery,
} from '#platform/server/sqlite';
import * as wasm from '#platform/server/sqlite/wasm';

import {
  BudgetInUseError,
  StorageMigrationError,
  StorageUnavailableError,
} from './errors';
import { getSqliteFileRow, putSqliteFileRow } from './files-store';
import { applyFilePragmas, createOpfsStore, POOL_ROOT } from './opfs-sahpool';
import { legacyDatabaseName } from './paths';
import {
  initWasmEngine,
  listIndexedDbNames,
  resetIndexedDb,
  seedLegacyDatabase,
} from './test-helpers';

const noSleep = () => Promise.resolve();

const PATH = '/documents/Actual/budget-one/db.sqlite';

// A pool that keeps files in memory and records every call
function fakePool(
  files = new Map<string, Uint8Array>(),
  { failUnpauses = 0 } = {},
) {
  let paused = false;
  let unpauses = 0;
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
      unpauses++;
      if (unpauses <= failUnpauses) {
        throw new Error('NoModificationAllowedError: handles are locked');
      }
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
  { failInstalls = 0, failExec = false } = {},
) {
  let installs = 0;
  const execLog: string[] = [];
  class FakeDB {
    name: string;
    constructor(options: { filename: string; flags: string; vfs: string }) {
      this.name = options.filename;
      if (!pool.files.has(options.filename)) {
        if (!options.flags.includes('c')) {
          throw new Error('SQLITE_CANTOPEN');
        }
        // As the real VFS does, creating a database adds its file to the pool
        pool.files.set(options.filename, new Uint8Array(0));
      }
    }
    exec(sql: string) {
      if (failExec) {
        throw new Error('disk I/O error');
      }
      execLog.push(sql);
    }
    selectValue(sql: string) {
      execLog.push(sql);
      if (sql.includes('quick_check')) return 'ok';
      return 1;
    }
    close() {
      // Nothing to release in the fake
    }
  }
  const api = {
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

// A previous-release tab's absurd-sql connection, which never closes
function holdStubbornConnection(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

beforeAll(() => initWasmEngine());

beforeEach(() => resetIndexedDb());

// A budget database as the app would have written it
async function budgetBytes(value: string): Promise<Uint8Array> {
  const source = await openDatabase();
  execQuery(
    source,
    'CREATE TABLE __migrations__ (id INTEGER PRIMARY KEY); CREATE TABLE t (v TEXT);',
  );
  runQuery(source, 'INSERT INTO t (v) VALUES (?)', [value]);
  const bytes = await exportDatabase(source);
  closeDatabase(source);
  return bytes;
}

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
        forceReinitIfPreviouslyFailed: true,
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

  it('retries a failed install', async () => {
    const pool = fakePool();
    const sqlite3 = fakeSqlite3(pool, { failInstalls: 2 });
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    await store.open(PATH);
    expect(sqlite3.installOpfsSAHPoolVfs).toHaveBeenCalledTimes(3);
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

  it('hands two concurrent opens of one file the same handle and migrates once', async () => {
    await seedLegacyDatabase(
      legacyDatabaseName(PATH),
      await budgetBytes('once'),
    );
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    const [first, second] = await Promise.all([
      store.open(PATH),
      store.open(PATH),
    ]);
    expect(second).toBe(first);
    expect(pool.importDb).toHaveBeenCalledTimes(1);
  });

  it('releases the pool when an open fails after the handle was created', async () => {
    const pool = fakePool();
    const { acquire, releases } = trackingLock();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool, { failExec: true }),
      acquireLock: acquire,
      sleep: noSleep,
    });

    await expect(store.open(PATH)).rejects.toThrow(/disk I\/O/);
    expect(pool.pauseVfs).toHaveBeenCalledTimes(1);
    expect(releases).toEqual(['actual-budget:documents-Actual-budget-one']);
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

  it('retries unpausing a pool whose handles are still held', async () => {
    const pool = fakePool(new Map(), { failUnpauses: 1 });
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    const db = await store.open(PATH);
    store.close(PATH, db);
    await store.open(PATH);
    expect(pool.unpauseVfs).toHaveBeenCalledTimes(2);
  });

  it('writes the marker on a later open when the first failed after creating the file', async () => {
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    const setSpy = vi
      .spyOn(idb, 'set')
      .mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(store.open(PATH)).rejects.toThrow(/quota/);
    setSpy.mockRestore();
    // The file is in the pool, with no row to say so
    expect(pool.files.size).toBe(1);
    expect(await getSqliteFileRow(PATH)).toBeUndefined();

    const db = await store.open(PATH);
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
    store.close(PATH, db);
  });

  it('imports the absurd-sql copy again when the marker write failed', async () => {
    const name = legacyDatabaseName(PATH);
    await seedLegacyDatabase(name, await budgetBytes('kept'));
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    const setSpy = vi
      .spyOn(idb, 'set')
      .mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(store.open(PATH)).rejects.toBeInstanceOf(
      StorageMigrationError,
    );
    setSpy.mockRestore();
    // Nothing of the failed move is left, and the copy is intact
    expect(pool.files.size).toBe(0);
    expect(await listIndexedDbNames()).toContain(name);

    const db = await store.open(PATH);
    expect(pool.importDb).toHaveBeenCalledTimes(2);
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
    expect(await listIndexedDbNames()).not.toContain(name);
    store.close(PATH, db);
  });

  it('discards an adopted fallback row when the marker write fails', async () => {
    await putSqliteFileRow({
      filepath: PATH,
      contents: await budgetBytes('from fallback'),
      storage: 'memory-idb',
      rev: 7,
    });
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    const setSpy = vi
      .spyOn(idb, 'set')
      .mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(store.open(PATH)).rejects.toBeInstanceOf(
      StorageMigrationError,
    );
    setSpy.mockRestore();
    expect(pool.files.size).toBe(0);
    expect((await getSqliteFileRow(PATH))?.storage).toBe('memory-idb');

    const db = await store.open(PATH);
    expect(pool.importDb).toHaveBeenCalledTimes(2);
    expect(await getSqliteFileRow(PATH)).toMatchObject({
      storage: 'opfs',
      rev: 7,
    });
    store.close(PATH, db);
  });

  it('refuses to replace a database the pool has lost', async () => {
    // Marked as living in OPFS, with a stale absurd-sql copy still around
    await putSqliteFileRow({ filepath: PATH, contents: '', storage: 'opfs' });
    const name = legacyDatabaseName(PATH);
    await seedLegacyDatabase(name, await budgetBytes('stale'));
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    await expect(store.open(PATH)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    expect(pool.importDb).not.toHaveBeenCalled();
    expect(pool.files.size).toBe(0);
    // The marker and the copy are left as they were
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
    expect(await listIndexedDbNames()).toContain(name);
  });

  it('drops a leftover journal before a file is replaced', async () => {
    const pool = fakePool(
      new Map([
        ['/db.sqlite', new Uint8Array([1])],
        ['/db.sqlite-journal', new Uint8Array([2])],
      ]),
    );
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    await store.writeFile(PATH, await budgetBytes('restored'));
    expect(pool.files.has('/db.sqlite-journal')).toBe(false);
    expect(pool.unlink.mock.invocationCallOrder[0]).toBeLessThan(
      pool.importDb.mock.invocationCallOrder[0],
    );
  });

  it('keeps the pool live while operations overlap', async () => {
    await seedLegacyDatabase(
      legacyDatabaseName(PATH),
      await budgetBytes('slow'),
    );
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    // A write to another file of the directory ends while the open is
    // still importing
    const opening = store.open(PATH);
    await store.writeFile(
      '/documents/Actual/budget-one/other.sqlite',
      new Uint8Array([1]),
    );
    expect(pool.pauseVfs).not.toHaveBeenCalled();
    const db = await opening;
    expect(pool.pauseVfs).not.toHaveBeenCalled();
    store.close(PATH, db);
    expect(pool.pauseVfs).toHaveBeenCalledTimes(1);
  });

  it('reads a database being opened from its handle', async () => {
    await seedLegacyDatabase(
      legacyDatabaseName(PATH),
      await budgetBytes('slow'),
    );
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    const exportSpy = vi
      .spyOn(wasm, 'exportBytes')
      .mockReturnValue(new Uint8Array([7]));
    try {
      const opening = store.open(PATH);
      expect(await store.readFile(PATH)).toEqual(new Uint8Array([7]));
      expect(exportSpy).toHaveBeenCalledWith(await opening);
      expect(pool.importDb).toHaveBeenCalledTimes(1);
    } finally {
      exportSpy.mockRestore();
    }
  });

  it('waits for an open in flight before removing its file', async () => {
    await seedLegacyDatabase(
      legacyDatabaseName(PATH),
      await budgetBytes('slow'),
    );
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    const opening = store.open(PATH);
    await store.removeFile(PATH);
    await opening;
    expect(pool.importDb).toHaveBeenCalledTimes(1);
    expect(pool.files.size).toBe(0);
    expect(await getSqliteFileRow(PATH)).toBeUndefined();
  });

  it('takes the lock again when a close settled the pool meanwhile', async () => {
    const pool = fakePool(new Map([['/other.sqlite', new Uint8Array([1])]]));
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    const db = await store.open(PATH);

    // The read finds the pool held, then the close settles it before the
    // read continues
    const reading = store.readFile('/documents/Actual/budget-one/other.sqlite');
    store.close(PATH, db);
    expect(pool.pauseVfs).toHaveBeenCalledTimes(1);
    expect(await reading).toEqual(new Uint8Array([1]));
    expect(pool.unpauseVfs).toHaveBeenCalledTimes(1);
    expect(pool.pauseVfs).toHaveBeenCalledTimes(2);
  });

  it('removes several files under their pools together, or none of them', async () => {
    const pool = fakePool(new Map([['/db.sqlite', new Uint8Array([1])]]));
    const refuse = neverLock();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      // The second budget is open elsewhere
      acquireLock: name =>
        name.endsWith('budget-one')
          ? Promise.resolve(() => undefined)
          : refuse(),
      sleep: noSleep,
    });

    await expect(
      store.removeFiles([PATH, '/documents/Actual/budget-two/db.sqlite']),
    ).rejects.toBeInstanceOf(BudgetInUseError);
    expect(pool.unlink).not.toHaveBeenCalled();
    expect(pool.files.has('/db.sqlite')).toBe(true);
  });

  it('prefers the fallback row over a pooled file an interrupted promotion left', async () => {
    const newer = await budgetBytes('newer');
    await putSqliteFileRow({
      filepath: PATH,
      contents: newer,
      storage: 'memory-idb',
      rev: 3,
    });
    const pool = fakePool(new Map([['/db.sqlite', new Uint8Array([1])]]));
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    const db = await store.open(PATH);
    const pooled = pool.files.get('/db.sqlite');
    expect(pooled && Buffer.from(pooled).equals(Buffer.from(newer))).toBe(true);
    expect(await getSqliteFileRow(PATH)).toMatchObject({
      storage: 'opfs',
      rev: 3,
    });
    store.close(PATH, db);
  });

  it('recovers a closed file through a connection before exporting it', async () => {
    const pool = fakePool(new Map([['/db.sqlite', new Uint8Array([1])]]));
    const sqlite3 = fakeSqlite3(pool);
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    await putSqliteFileRow({ filepath: PATH, contents: '', storage: 'opfs' });

    expect(await store.readFile(PATH)).toEqual(new Uint8Array([1]));
    expect(sqlite3.execLog).toContain('PRAGMA schema_version');
  });

  it('prefers an absurd-sql copy over a pooled file nothing claims', async () => {
    const bytes = await budgetBytes('kept editing in legacy');
    await seedLegacyDatabase(legacyDatabaseName(PATH), bytes);
    const pool = fakePool(new Map([['/db.sqlite', new Uint8Array([1])]]));
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    const db = await store.open(PATH);
    const pooled = pool.files.get('/db.sqlite');
    expect(pooled && Buffer.from(pooled).equals(Buffer.from(bytes))).toBe(true);
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
    store.close(PATH, db);
  });

  it('refuses the cutover when a tab reopens the legacy copy during the move', async () => {
    const name = legacyDatabaseName(PATH);
    await seedLegacyDatabase(name, await budgetBytes('kept'));
    const pool = fakePool();
    const realImport = pool.importDb.getMockImplementation();
    if (!realImport) {
      throw new Error('the fake pool has no import');
    }
    let other: IDBDatabase | undefined;
    pool.importDb.mockImplementationOnce(async (fileName, data) => {
      other = await holdStubbornConnection(name);
      return realImport(fileName, data);
    });
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    try {
      await expect(store.open(PATH)).rejects.toBeInstanceOf(BudgetInUseError);
    } finally {
      other?.close();
    }
    // Nothing of the move is left, and the copy with its edits is intact
    expect(pool.files.size).toBe(0);
    expect(await getSqliteFileRow(PATH)).toBeUndefined();
    expect(await listIndexedDbNames()).toContain(name);
  });

  it('keeps an open waiting while a write replaces the file', async () => {
    const pool = fakePool();
    const sqlite3 = fakeSqlite3(pool);
    const store = createOpfsStore({
      sqlite3: () => sqlite3,
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });
    const realImport = pool.importDb.getMockImplementation();
    if (!realImport) {
      throw new Error('the fake pool has no import');
    }
    let finishImport = () => undefined as void;
    pool.importDb.mockImplementationOnce(async (fileName, data) => {
      await new Promise<void>(resolve => {
        finishImport = resolve;
      });
      return realImport(fileName, data);
    });

    const writing = store.writeFile(PATH, await budgetBytes('written'));
    const opening = store.open(PATH);
    await new Promise(resolve => setTimeout(resolve, 20));
    // No connection yet: the open waits for the import
    const hasOpened = () =>
      sqlite3.execLog.some(sql => sql.includes('locking_mode'));
    expect(hasOpened()).toBe(false);
    finishImport();
    await writing;
    const db = await opening;
    expect(hasOpened()).toBe(true);
    store.close(PATH, db);
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
    const delSpy = vi.spyOn(idb, 'del');
    await store.removeFile(PATH);
    expect(pool.unlink).toHaveBeenCalledWith('/db.sqlite');
    expect(pool.unlink).toHaveBeenCalledWith('/db.sqlite-journal');
    expect(pool.wipeFiles).toHaveBeenCalled();
    expect(pool.removeVfs).not.toHaveBeenCalled();
    expect(pool.pauseVfs).toHaveBeenCalled();
    // The marker goes while the budget is still held
    expect(delSpy.mock.invocationCallOrder[0]).toBeLessThan(
      pool.pauseVfs.mock.invocationCallOrder.at(-1) as number,
    );
    delSpy.mockRestore();
  });

  it('imports an absurd-sql database into the pool and verifies it', async () => {
    const bytes = await budgetBytes('legacy');
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
    expect(await listIndexedDbNames()).not.toContain(name);
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
  });

  it('prefers the fallback row over a stale absurd-sql copy', async () => {
    const name = legacyDatabaseName(PATH);
    await seedLegacyDatabase(name, await budgetBytes('stale'));
    const current = await budgetBytes('current');
    await putSqliteFileRow({
      filepath: PATH,
      contents: current,
      storage: 'memory-idb',
      rev: 2,
    });
    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    await store.open(PATH);
    const imported = pool.files.get('/db.sqlite');
    expect(imported && Buffer.from(imported).equals(Buffer.from(current))).toBe(
      true,
    );
    expect(pool.importDb).toHaveBeenCalledTimes(1);
    expect(await listIndexedDbNames()).not.toContain(name);
  });

  it('adopts a database the fallback store persisted', async () => {
    // The browser gained sync access handles since the fallback stored
    // this budget whole in its row
    const bytes = await budgetBytes('from fallback');
    await putSqliteFileRow({
      filepath: PATH,
      contents: bytes,
      storage: 'memory-idb',
      rev: 7,
    });

    const pool = fakePool();
    const store = createOpfsStore({
      sqlite3: () => fakeSqlite3(pool),
      acquireLock: trackingLock().acquire,
      sleep: noSleep,
    });

    await store.open(PATH);
    const imported = pool.files.get('/db.sqlite');
    expect(imported && Buffer.from(imported).equals(Buffer.from(bytes))).toBe(
      true,
    );
    const row = await getSqliteFileRow(PATH);
    expect(row).toMatchObject({ storage: 'opfs', contents: '', rev: 7 });
  });

  it('applies the file pragmas to a real database', async () => {
    // Memory databases accept the same pragmas; this guards the SQL text
    const db = await openDatabase();
    expect(() => applyFilePragmas(db as never)).not.toThrow();
    closeDatabase(db);
  });
});
