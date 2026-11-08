import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as idb from '#platform/server/indexeddb';
import {
  closeDatabase,
  execQuery,
  exportDatabase,
  openDatabase,
  runQuery,
  transaction,
} from '#platform/server/sqlite';

import * as absurdMigration from './absurd-migration';
import { BudgetInUseError, StorageUnavailableError } from './errors';
import {
  getSqliteFileRow,
  putSqliteFileRow,
  putSqliteFileRowIfRev,
} from './files-store';
import { createMemoryIdbStore, isByteContents } from './idb-memory';
import { legacyDatabaseName } from './paths';
import {
  initWasmEngine,
  listIndexedDbNames,
  resetIndexedDb,
  seedLegacyDatabase,
  sleep,
} from './test-helpers';

import { getSqliteStore, setSqliteStore } from './index';

const sendMock = vi.hoisted(() => vi.fn());
vi.mock('#platform/server/connection', () => ({ send: sendMock }));

const PATH = '/documents/Actual/budget-one/db.sqlite';
const SCHEMA =
  'CREATE TABLE __migrations__ (id INTEGER PRIMARY KEY); CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT);';

beforeAll(() => initWasmEngine());

beforeEach(async () => {
  await resetIndexedDb();
  sendMock.mockClear();
  setSqliteStore(createMemoryIdbStore({ debounceMs: 30, maxDirtyMs: 200 }));
});

async function rowBytes(path: string): Promise<Uint8Array | null> {
  const row = await getSqliteFileRow(path);
  return row && isByteContents(row.contents) ? row.contents : null;
}

// Closes the path with its write failing, so the store keeps the snapshot
async function strandSnapshot(value: string) {
  const db = await openDatabase(PATH);
  execQuery(db, SCHEMA);
  runQuery(db, 'INSERT INTO t (v) VALUES (?)', [value]);
  const setSpy = vi
    .spyOn(idb, 'set')
    .mockRejectedValueOnce(new Error('quota exceeded'));
  closeDatabase(db);
  await sleep(10);
  setSpy.mockRestore();
}

describe('IndexedDB in-memory store', () => {
  it('creates a database, persists after the debounce and reloads it', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    runQuery(db, "INSERT INTO t (v) VALUES ('hello')");
    expect(await rowBytes(PATH)).toBeNull();

    await vi.waitFor(async () => expect(await rowBytes(PATH)).not.toBeNull());
    expect((await getSqliteFileRow(PATH))?.storage).toBe('memory-idb');
    closeDatabase(db);

    const reopened = await openDatabase(PATH);
    expect(runQuery(reopened, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'hello' },
    ]);
    closeDatabase(reopened);
  });

  it('persists pending writes when the database is closed', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    runQuery(db, "INSERT INTO t (v) VALUES ('closing')");
    closeDatabase(db);
    // No debounce wait: close must have queued the write
    await sleep(10);
    const reopened = await openDatabase(PATH);
    expect(runQuery(reopened, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'closing' },
    ]);
    closeDatabase(reopened);
  });

  it('does not snapshot in the middle of a transaction', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    const before = await vi.waitFor(async () => {
      const bytes = await rowBytes(PATH);
      expect(bytes).not.toBeNull();
      return bytes as Uint8Array;
    });

    execQuery(db, 'BEGIN');
    runQuery(db, "INSERT INTO t (v) VALUES ('uncommitted')");
    // Well past the debounce: still the pre-transaction snapshot
    await sleep(80);
    expect(
      Buffer.from((await rowBytes(PATH)) as Uint8Array).equals(
        Buffer.from(before),
      ),
    ).toBe(true);
    execQuery(db, 'COMMIT');
    const committed = await vi.waitFor(async () => {
      const bytes = (await rowBytes(PATH)) as Uint8Array;
      expect(Buffer.from(bytes).equals(Buffer.from(before))).toBe(false);
      return bytes;
    });
    const after = await openDatabase(committed);
    expect(runQuery(after, 'SELECT count(*) AS n FROM t', [], true)).toEqual([
      { n: 1 },
    ]);
    closeDatabase(after);
    closeDatabase(db);
  });

  it('reads live bytes of an open database and whole files when closed', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    runQuery(db, "INSERT INTO t (v) VALUES ('live')");
    const store = getSqliteStore();
    const live = await openDatabase(await store.readFile(PATH));
    expect(runQuery(live, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'live' },
    ]);
    closeDatabase(live);
    closeDatabase(db);

    await sleep(10);
    const copyPath = '/documents/Actual/budget-two/db.sqlite';
    await store.writeFile(copyPath, await store.readFile(PATH));
    expect(await store.exists(copyPath)).toBe(true);
    const copy = await openDatabase(copyPath);
    expect(runQuery(copy, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'live' },
    ]);
    closeDatabase(copy);

    await store.removeFile(copyPath);
    expect(await store.exists(copyPath)).toBe(false);
  });

  it('stops persisting and reports when another tab wrote the file', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    await vi.waitFor(async () => expect(await rowBytes(PATH)).not.toBeNull());

    // Another tab bumps the revision
    const row = await getSqliteFileRow(PATH);
    await putSqliteFileRow({ ...row!, rev: (row?.rev ?? 0) + 5 });

    runQuery(db, "INSERT INTO t (v) VALUES ('conflict')");
    await vi.waitFor(() =>
      expect(sendMock).toHaveBeenCalledWith('fallback-write-error'),
    );
    // A refused snapshot is not durable either
    await expect(getSqliteStore().flush()).rejects.toThrow(/not written/);
    const persisted = await openDatabase((await rowBytes(PATH)) as Uint8Array);
    expect(
      runQuery(persisted, 'SELECT count(*) AS n FROM t', [], true),
    ).toEqual([{ n: 0 }]);
    closeDatabase(persisted);
    closeDatabase(db);
  });

  it('migrates an absurd-sql database on first open and removes it', async () => {
    const source = await openDatabase();
    execQuery(source, SCHEMA);
    runQuery(source, "INSERT INTO t (v) VALUES ('from legacy')");
    const bytes = await exportDatabase(source);
    closeDatabase(source);
    const name = legacyDatabaseName(PATH);
    await seedLegacyDatabase(name, bytes);
    // The legacy filesystem's marker row
    await putSqliteFileRow({ filepath: PATH, contents: '' });

    const db = await openDatabase(PATH);
    expect(runQuery(db, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'from legacy' },
    ]);
    closeDatabase(db);
    await sleep(10);

    expect(await listIndexedDbNames()).not.toContain(name);
    const row = await getSqliteFileRow(PATH);
    expect(row?.storage).toBe('memory-idb');
    expect(ArrayBuffer.isView(row?.contents)).toBe(true);
  });

  it('keeps a snapshot whose write on close failed for the next open', async () => {
    await strandSnapshot('rescued');
    // Nothing landed in the row, and the failure was reported
    expect(await rowBytes(PATH)).toBeNull();
    expect(sendMock).toHaveBeenCalledWith('storage-write-failed', {
      path: PATH,
    });

    // The next open continues from the snapshot and writes it
    const reopened = await openDatabase(PATH);
    expect(runQuery(reopened, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'rescued' },
    ]);
    await vi.waitFor(async () => expect(await rowBytes(PATH)).not.toBeNull());
    closeDatabase(reopened);
  });

  it('writes the snapshot again when the write in flight at close fails', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    runQuery(db, "INSERT INTO t (v) VALUES ('in flight')");
    const setSpy = vi
      .spyOn(idb, 'set')
      .mockRejectedValueOnce(new Error('quota exceeded'));
    // Start the write, then close before it lands
    void getSqliteStore().flush();
    closeDatabase(db);
    await vi.waitFor(async () => expect(await rowBytes(PATH)).not.toBeNull());
    setSpy.mockRestore();

    const reopened = await openDatabase(PATH);
    expect(runQuery(reopened, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'in flight' },
    ]);
    closeDatabase(reopened);
  });

  it('lets a written file replace a stranded snapshot', async () => {
    await strandSnapshot('stranded');
    const fresh = await openDatabase();
    execQuery(fresh, SCHEMA);
    runQuery(fresh, "INSERT INTO t (v) VALUES ('written')");
    await getSqliteStore().writeFile(PATH, await exportDatabase(fresh));
    closeDatabase(fresh);

    const reopened = await openDatabase(PATH);
    expect(runQuery(reopened, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'written' },
    ]);
    closeDatabase(reopened);
  });

  it('does not resurrect a stranded snapshot once the file is removed', async () => {
    await strandSnapshot('stranded');
    const store = getSqliteStore();
    await store.removeFile(PATH);
    await expect(store.readFile(PATH)).rejects.toThrow(/does not exist/);

    // A new, empty database
    const reopened = await openDatabase(PATH);
    expect(() => runQuery(reopened, 'SELECT v FROM t', [], true)).toThrow();
    closeDatabase(reopened);
    // Let its first write land before the next test resets the store
    await sleep(10);
  });

  it('hands two concurrent opens of one path the same database', async () => {
    const store = getSqliteStore();
    const [first, second] = await Promise.all([
      store.open(PATH),
      store.open(PATH),
    ]);
    expect(second).toBe(first);
    store.close(PATH, first);
    await sleep(10);
  });

  it('holds the budget lock for reads, writes and removals of closed files', async () => {
    // The legacy filesystem's marker row, so a read looks for absurd-sql
    // data
    await putSqliteFileRow({ filepath: PATH, contents: '' });
    const request = vi.fn(() =>
      Promise.reject(new DOMException('aborted', 'AbortError')),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    try {
      const store = getSqliteStore();
      await expect(store.readFile(PATH)).rejects.toBeInstanceOf(
        BudgetInUseError,
      );
      await expect(
        store.writeFile(PATH, new Uint8Array([1])),
      ).rejects.toBeInstanceOf(BudgetInUseError);
      await expect(store.removeFile(PATH)).rejects.toBeInstanceOf(
        BudgetInUseError,
      );
      // The row was not touched
      expect((await getSqliteFileRow(PATH))?.contents).toBe('');
    } finally {
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        configurable: true,
      });
    }
  });

  it('discards an open transaction when the database closes', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    execQuery(db, 'BEGIN');
    runQuery(db, "INSERT INTO t (v) VALUES ('uncommitted')");
    closeDatabase(db);
    await sleep(10);

    const reopened = await openDatabase(PATH);
    expect(runQuery(reopened, 'SELECT count(*) AS n FROM t', [], true)).toEqual(
      [{ n: 0 }],
    );
    closeDatabase(reopened);
  });

  it('retries a failed write once without another write', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    const before = await vi.waitFor(async () => {
      const bytes = await rowBytes(PATH);
      expect(bytes).not.toBeNull();
      return bytes as Uint8Array;
    });

    const setSpy = vi
      .spyOn(idb, 'set')
      .mockRejectedValueOnce(new Error('transient'));
    runQuery(db, "INSERT INTO t (v) VALUES ('retried')");
    const after = await vi.waitFor(async () => {
      const bytes = (await rowBytes(PATH)) as Uint8Array;
      expect(Buffer.from(bytes).equals(Buffer.from(before))).toBe(false);
      return bytes;
    });
    expect(setSpy).toHaveBeenCalledTimes(2);
    setSpy.mockRestore();
    const copy = await openDatabase(after);
    expect(runQuery(copy, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'retried' },
    ]);
    closeDatabase(copy);
    closeDatabase(db);
  });

  it('persists a write that returns rows', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    const before = await vi.waitFor(async () => {
      const bytes = await rowBytes(PATH);
      expect(bytes).not.toBeNull();
      return bytes as Uint8Array;
    });

    expect(
      runQuery(
        db,
        "INSERT INTO t (v) VALUES ('returned') RETURNING id",
        [],
        true,
      ),
    ).toEqual([{ id: 1 }]);
    const after = await vi.waitFor(async () => {
      const bytes = (await rowBytes(PATH)) as Uint8Array;
      expect(Buffer.from(bytes).equals(Buffer.from(before))).toBe(false);
      return bytes;
    });
    const copy = await openDatabase(after);
    expect(runQuery(copy, 'SELECT count(*) AS n FROM t', [], true)).toEqual([
      { n: 1 },
    ]);
    closeDatabase(copy);
    closeDatabase(db);
  });

  it('persists what a failing statement left behind', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    const before = await vi.waitFor(async () => {
      const bytes = await rowBytes(PATH);
      expect(bytes).not.toBeNull();
      return bytes as Uint8Array;
    });

    // OR FAIL keeps the first row when the second conflicts
    expect(() =>
      runQuery(
        db,
        "INSERT OR FAIL INTO t (id, v) VALUES (1, 'kept'), (1, 'dup')",
        [],
        false,
      ),
    ).toThrow(/constraint/i);
    const after = await vi.waitFor(async () => {
      const bytes = (await rowBytes(PATH)) as Uint8Array;
      expect(Buffer.from(bytes).equals(Buffer.from(before))).toBe(false);
      return bytes;
    });
    const copy = await openDatabase(after);
    expect(runQuery(copy, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'kept' },
    ]);
    closeDatabase(copy);
    closeDatabase(db);
  });

  it('persists what a failing script left behind', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    const before = await vi.waitFor(async () => {
      const bytes = await rowBytes(PATH);
      expect(bytes).not.toBeNull();
      return bytes as Uint8Array;
    });

    // The first statement is committed before the second fails
    expect(() =>
      execQuery(
        db,
        "INSERT INTO t (v) VALUES ('kept'); INSERT INTO nope VALUES (1);",
      ),
    ).toThrow(/no such table/i);
    const after = await vi.waitFor(async () => {
      const bytes = (await rowBytes(PATH)) as Uint8Array;
      expect(Buffer.from(bytes).equals(Buffer.from(before))).toBe(false);
      return bytes;
    });
    const copy = await openDatabase(after);
    expect(runQuery(copy, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'kept' },
    ]);
    closeDatabase(copy);
    closeDatabase(db);
  });

  it('flushes close writes still in flight', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    runQuery(db, "INSERT INTO t (v) VALUES ('closing')");
    closeDatabase(db);
    await getSqliteStore().flush();
    expect(await rowBytes(PATH)).not.toBeNull();
  });

  it('coordinates reads, writes and removals with an open in flight', async () => {
    const source = await openDatabase();
    execQuery(source, SCHEMA);
    runQuery(source, "INSERT INTO t (v) VALUES ('from legacy')");
    const bytes = await exportDatabase(source);
    closeDatabase(source);
    await seedLegacyDatabase(legacyDatabaseName(PATH), bytes);
    await putSqliteFileRow({ filepath: PATH, contents: '' });
    const store = getSqliteStore();

    // A read during the migrating open comes from the opened database
    const readLegacy = vi.spyOn(absurdMigration, 'readLegacyDatabaseBytes');
    try {
      const opening = store.open(PATH);
      const read = await openDatabase(await store.readFile(PATH));
      expect(runQuery(read, 'SELECT v FROM t', [], true)).toEqual([
        { v: 'from legacy' },
      ]);
      closeDatabase(read);
      expect(readLegacy).toHaveBeenCalledTimes(1);
      store.close(PATH, await opening);
    } finally {
      readLegacy.mockRestore();
    }

    // A write waits for an open in flight and then refuses as for any open
    // database; a removal waits and then closes and removes it
    const reopening = store.open(PATH);
    await expect(store.writeFile(PATH, bytes)).rejects.toThrow(/open database/);
    store.close(PATH, await reopening);
    const third = store.open(PATH);
    await store.removeFile(PATH);
    await third;
    await expect(store.readFile(PATH)).rejects.toThrow(/does not exist/);
  });

  it('removes several files together, or none of them', async () => {
    const other = '/documents/Actual/budget-two/db.sqlite';
    const store = getSqliteStore();
    await store.writeFile(PATH, new Uint8Array([1]));
    await putSqliteFileRow({ filepath: other, contents: '', storage: 'opfs' });
    await expect(store.removeFiles([PATH, other])).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    expect(await store.exists(PATH)).toBe(true);

    // Once the other budget is ours too, both go
    await putSqliteFileRow({
      filepath: other,
      contents: new Uint8Array([2]),
      storage: 'memory-idb',
      rev: 1,
    });
    await store.removeFiles([PATH, other]);
    expect(await store.exists(PATH)).toBe(false);
    expect(await store.exists(other)).toBe(false);
  });

  it('writes a row only at the revision it expects', async () => {
    await putSqliteFileRow({ filepath: PATH, contents: '', rev: 1 });
    const next = { filepath: PATH, contents: new Uint8Array([1]), rev: 2 };
    expect(await putSqliteFileRowIfRev(next, 1)).toBe(true);
    expect(await putSqliteFileRowIfRev({ ...next, rev: 3 }, 1)).toBe(false);
    expect((await getSqliteFileRow(PATH))?.rev).toBe(2);
  });

  it('reports files it could not write when flushed', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    await vi.waitFor(async () => expect(await rowBytes(PATH)).not.toBeNull());
    const setSpy = vi
      .spyOn(idb, 'set')
      .mockRejectedValue(new Error('quota exceeded'));
    const store = getSqliteStore();
    try {
      runQuery(db, "INSERT INTO t (v) VALUES ('stuck')");
      await expect(store.flush()).rejects.toThrow(/not written/);
    } finally {
      setSpy.mockRestore();
    }

    await store.flush();
    const copy = await openDatabase((await rowBytes(PATH)) as Uint8Array);
    expect(runQuery(copy, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'stuck' },
    ]);
    closeDatabase(copy);
    closeDatabase(db);
  });

  it('drops a stranded snapshot the row has moved past', async () => {
    await strandSnapshot('stranded');
    // Another worker wrote the file meanwhile
    const source = await openDatabase();
    execQuery(source, SCHEMA);
    runQuery(source, "INSERT INTO t (v) VALUES ('from elsewhere')");
    await putSqliteFileRow({
      filepath: PATH,
      contents: await exportDatabase(source),
      storage: 'memory-idb',
      rev: 9,
    });
    closeDatabase(source);

    const reopened = await openDatabase(PATH);
    expect(runQuery(reopened, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'from elsewhere' },
    ]);
    closeDatabase(reopened);
  });

  it('refuses a new file another worker created meanwhile', async () => {
    const lookup = vi
      .spyOn(absurdMigration, 'readLegacyDatabaseBytes')
      .mockImplementation(async () => {
        // Lands between this worker's row read and its marker write
        await putSqliteFileRow({
          filepath: PATH,
          contents: new Uint8Array([1]),
          storage: 'memory-idb',
          rev: 1,
        });
        return null;
      });
    try {
      await expect(openDatabase(PATH)).rejects.toBeInstanceOf(BudgetInUseError);
    } finally {
      lookup.mockRestore();
    }
    expect((await getSqliteFileRow(PATH))?.rev).toBe(1);
  });

  it('reports a write that failed for good', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    await vi.waitFor(async () => expect(await rowBytes(PATH)).not.toBeNull());
    const setSpy = vi
      .spyOn(idb, 'set')
      .mockRejectedValue(new Error('quota exceeded'));
    try {
      runQuery(db, "INSERT INTO t (v) VALUES ('lost')");
      // Not on the first failure, which gets a retry, but on the second
      await vi.waitFor(() =>
        expect(sendMock).toHaveBeenCalledWith('storage-write-failed', {
          path: PATH,
        }),
      );
      expect(setSpy).toHaveBeenCalledTimes(2);
    } finally {
      setSpy.mockRestore();
    }
    closeDatabase(db);
    await sleep(10);
  });

  it('refuses a database held in OPFS rather than shadow or take it over', async () => {
    await putSqliteFileRow({ filepath: PATH, contents: '', storage: 'opfs' });
    await expect(openDatabase(PATH)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    await expect(
      getSqliteStore().writeFile(PATH, new Uint8Array([1])),
    ).rejects.toBeInstanceOf(StorageUnavailableError);
    await expect(getSqliteStore().removeFile(PATH)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    // Nothing was written over the marker, and it is still there
    expect(await getSqliteFileRow(PATH)).toMatchObject({
      storage: 'opfs',
      contents: '',
    });
  });

  it('keeps transactions working through the facade on file databases', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    expect(() =>
      transaction(db, () => {
        runQuery(db, "INSERT INTO t (id, v) VALUES (1, 'a')");
        runQuery(db, "INSERT INTO t (id, v) VALUES (1, 'b')");
      }),
    ).toThrow(/constraint/i);
    expect(runQuery(db, 'SELECT count(*) AS n FROM t', [], true)).toEqual([
      { n: 0 },
    ]);
    closeDatabase(db);
  });
});
