import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  closeDatabase,
  execQuery,
  openDatabase,
  runQuery,
} from '#platform/server/sqlite';

import { readLegacyDatabaseBytes } from './absurd-migration';
import { getSqliteFileRow, hasMigratedSqliteFiles } from './files-store';
import { createMemoryIdbStore } from './idb-memory';
import { legacyDatabaseName } from './paths';
import {
  initWasmEngine,
  listIndexedDbNames,
  resetIndexedDb,
} from './test-helpers';

import { getSqliteStore, revertToLegacy, setSqliteStore } from './index';

const sendMock = vi.hoisted(() => vi.fn());
vi.mock('#platform/server/connection', () => ({ send: sendMock }));

const PATH = '/documents/Actual/budget-one/db.sqlite';
const OTHER = '/documents/Actual/budget-two/db.sqlite';
const SCHEMA =
  'CREATE TABLE __migrations__ (id INTEGER PRIMARY KEY); CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT);';

beforeAll(() => initWasmEngine());

let previousStore: ReturnType<typeof createMemoryIdbStore> | null = null;

beforeEach(async () => {
  // Pending writes of the previous test's store must not land in this one
  await previousStore?.releaseAll();
  await resetIndexedDb();
  sendMock.mockClear();
  previousStore = createMemoryIdbStore({ debounceMs: 10, maxDirtyMs: 50 });
  setSqliteStore(previousStore);
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
    expect(await hasMigratedSqliteFiles()).toBe(true);

    await revertToLegacy();

    expect(await hasMigratedSqliteFiles()).toBe(false);
    for (const path of [PATH, OTHER]) {
      expect(await getSqliteFileRow(path)).toEqual({
        filepath: path,
        contents: '',
      });
      expect(await listIndexedDbNames()).toContain(legacyDatabaseName(path));
    }
    const back = await readLegacyDatabaseBytes(PATH);
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
    expect(await listIndexedDbNames()).not.toContain(legacyDatabaseName(PATH));
  });

  it('is a no-op without migrated budgets', async () => {
    await revertToLegacy();
    expect(await hasMigratedSqliteFiles()).toBe(false);
  });
});
