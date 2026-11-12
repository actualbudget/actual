import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  closeDatabase,
  execQuery,
  openDatabase,
  runQuery,
} from '#platform/server/sqlite';

import { readLegacyDatabaseBytes } from './absurd-migration';
import { StorageUnavailableError } from './errors';
import {
  getSqliteFileRow,
  hasMigratedSqliteFiles,
  putSqliteFileRow,
} from './files-store';
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

  it('drops a budget the fallback recorded but never saved', async () => {
    // The mark a new database gets before its first save, left by a crash
    await putSqliteFileRow({
      filepath: PATH,
      contents: new Uint8Array(0),
      storage: 'memory-idb',
      rev: 1,
    });
    await createBudget(OTHER, 'two');

    await revertToLegacy();

    expect(await hasMigratedSqliteFiles()).toBe(false);
    expect(await getSqliteFileRow(PATH)).toBeUndefined();
    expect(await listIndexedDbNames()).not.toContain(legacyDatabaseName(PATH));
    // The budget with data still moved back
    expect(await getSqliteFileRow(OTHER)).toEqual({
      filepath: OTHER,
      contents: '',
    });
    expect(await listIndexedDbNames()).toContain(legacyDatabaseName(OTHER));
  });

  it('still refuses a budget whose bytes are out of reach', async () => {
    await putSqliteFileRow({ filepath: PATH, contents: '', storage: 'opfs' });
    await expect(revertToLegacy()).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    expect((await getSqliteFileRow(PATH))?.storage).toBe('opfs');
  });

  it('holds the budget lock from the read to the cutover', async () => {
    await createBudget(PATH, 'one');
    const name = legacyDatabaseName(PATH);
    const held: string[] = [];
    const releases: Promise<void>[] = [];
    let copyExistedAtRelease: boolean | null = null;
    const request = vi.fn(
      (lockName: string, _options: unknown, callback: () => Promise<void>) => {
        held.push(lockName);
        // Looks at the store the moment the lock is given back
        const released = callback().then(async () => {
          copyExistedAtRelease = (await listIndexedDbNames()).includes(name);
        });
        releases.push(released);
        return released;
      },
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    try {
      await revertToLegacy();
      await Promise.all(releases);
    } finally {
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        configurable: true,
      });
    }
    // One hold for the budget, still in place when its copy was complete
    expect(
      held.filter(
        lockName => lockName === 'actual-budget:documents-Actual-budget-one',
      ),
    ).toHaveLength(1);
    expect(copyExistedAtRelease).toBe(true);
  });

  it('is a no-op without migrated budgets', async () => {
    await revertToLegacy();
    expect(await hasMigratedSqliteFiles()).toBe(false);
  });
});
