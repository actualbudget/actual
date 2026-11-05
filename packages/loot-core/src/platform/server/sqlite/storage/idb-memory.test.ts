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

import { StorageUnavailableError } from './errors';
import { getSqliteFileRow, putSqliteFileRow } from './files-store';
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

    await sleep(80);
    const persisted = await rowBytes(PATH);
    expect(persisted).not.toBeNull();
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
    await sleep(60);
    const before = await rowBytes(PATH);

    execQuery(db, 'BEGIN');
    runQuery(db, "INSERT INTO t (v) VALUES ('uncommitted')");
    await sleep(80);
    // Still the pre-transaction snapshot
    expect(
      Buffer.from((await rowBytes(PATH)) as Uint8Array).equals(
        Buffer.from(before as Uint8Array),
      ),
    ).toBe(true);
    execQuery(db, 'COMMIT');
    await sleep(80);
    const after = await openDatabase((await rowBytes(PATH)) as Uint8Array);
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
    await sleep(60);

    // Another tab bumps the revision
    const row = await getSqliteFileRow(PATH);
    await putSqliteFileRow({ ...row!, rev: (row?.rev ?? 0) + 5 });

    runQuery(db, "INSERT INTO t (v) VALUES ('conflict')");
    await sleep(80);
    expect(sendMock).toHaveBeenCalledWith('fallback-write-error');
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
    // Nothing landed in the row
    expect(await rowBytes(PATH)).toBeNull();

    // The next open continues from the snapshot and writes it
    const reopened = await openDatabase(PATH);
    expect(runQuery(reopened, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'rescued' },
    ]);
    await sleep(80);
    expect(await rowBytes(PATH)).not.toBeNull();
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
    await sleep(30);
    setSpy.mockRestore();
    expect(await rowBytes(PATH)).not.toBeNull();

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

  it('refuses a database held in OPFS rather than shadow it', async () => {
    await putSqliteFileRow({ filepath: PATH, contents: '', storage: 'opfs' });
    await expect(openDatabase(PATH)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    // Nothing was written over the marker
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
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
