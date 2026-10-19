import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as idb from '#platform/server/indexeddb';
import {
  closeDatabase,
  execQuery,
  init,
  openDatabase,
  runQuery,
} from '#platform/server/sqlite';

import {
  legacyDatabaseExists,
  readLegacyDatabaseBytes,
} from './absurd-migration';
import { findMigratedStorageKind, getSqliteFileRow } from './files-store';
import { createMemoryIdbStore } from './idb-memory';
import { legacyDatabaseName } from './paths';
import { readSqliteWasm } from './test-helpers';

import {
  getSqliteStore,
  hasSqliteStore,
  revertToLegacy,
  setSqliteStore,
} from './index';

const sendMock = vi.hoisted(() => vi.fn());
vi.mock('#platform/server/connection', () => ({ send: sendMock }));

const PATH = '/documents/Actual/budget-one/db.sqlite';
const OTHER = '/documents/Actual/budget-two/db.sqlite';
const SCHEMA =
  'CREATE TABLE __migrations__ (id INTEGER PRIMARY KEY); CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT);';

beforeAll(() => init({ storage: 'memory-idb', wasmBinary: readSqliteWasm() }));

beforeEach(async () => {
  // Pending writes of the previous test's store must not land in this one
  if (hasSqliteStore()) {
    await getSqliteStore().releaseAll();
  }
  global.indexedDB = new IDBFactory();
  await idb.closeDatabase();
  void idb.openDatabase();
  setSqliteStore(createMemoryIdbStore({ debounceMs: 10, maxDirtyMs: 50 }));
});

async function createBudget(path: string, value: string) {
  const db = await openDatabase(path);
  execQuery(db, SCHEMA);
  runQuery(db, 'INSERT INTO t (v) VALUES (?)', [value]);
  closeDatabase(db);
}

describe('reverting to the legacy storage layout', () => {
  it('moves every budget back and clears the markers', async () => {
    await createBudget(PATH, 'one');
    await createBudget(OTHER, 'two');
    const before = await getSqliteStore().readFile(PATH);
    expect(await findMigratedStorageKind()).toBe('memory-idb');

    await revertToLegacy();

    expect(await findMigratedStorageKind()).toBeNull();
    for (const path of [PATH, OTHER]) {
      expect(await getSqliteFileRow(path)).toEqual({
        filepath: path,
        contents: '',
      });
      expect(await legacyDatabaseExists(legacyDatabaseName(path))).toBe(true);
    }
    const back = await readLegacyDatabaseBytes(PATH, legacyDatabaseName(PATH));
    expect(Buffer.from(back as Uint8Array).equals(Buffer.from(before))).toBe(
      true,
    );
    // And the legacy bytes are a working database with the data
    const db = await openDatabase(back as Uint8Array);
    expect(runQuery(db, 'SELECT v FROM t', [], true)).toEqual([{ v: 'one' }]);
    closeDatabase(db);
  });

  it('refuses while a database is open', async () => {
    const db = await openDatabase(PATH);
    execQuery(db, SCHEMA);
    await expect(revertToLegacy()).rejects.toThrow(/open database/);
    closeDatabase(db);
    expect(await legacyDatabaseExists(legacyDatabaseName(PATH))).toBe(false);
  });

  it('is a no-op without migrated budgets', async () => {
    await revertToLegacy();
    expect(await findMigratedStorageKind()).toBeNull();
  });
});
