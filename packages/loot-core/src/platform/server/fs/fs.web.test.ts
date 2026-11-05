import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as idb from '#platform/server/indexeddb';
import * as sqlite from '#platform/server/sqlite';
import { BudgetInUseError } from '#platform/server/sqlite/storage/errors';
import { getSqliteFileRow } from '#platform/server/sqlite/storage/files-store';
import {
  initWasmEngine,
  resetIndexedDb,
  sleep,
} from '#platform/server/sqlite/storage/test-helpers';

import {
  _setDocumentDir,
  copyFile,
  exists,
  init,
  listDir,
  mkdir,
  readFile,
  removeDir,
  removeDirRecursively,
  removeFile,
  writeFile,
} from './index';

beforeAll(() => initWasmEngine());

beforeEach(() => resetIndexedDb());

async function databaseBytes(): Promise<Uint8Array> {
  const db = await sqlite.openDatabase();
  sqlite.execQuery(db, "CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('x');");
  const bytes = await sqlite.exportDatabase(db);
  sqlite.closeDatabase(db);
  return bytes;
}

describe('web filesystem (sqlite-wasm storage)', () => {
  it('stores persisted files in IndexedDB and transient files in memory', async () => {
    await init();

    await writeFile('/documents/foo.txt', 'hello');
    expect(await readFile('/documents/foo.txt')).toBe('hello');

    const text = 'hello, world';
    const buffer = new ArrayBuffer(text.length * 2);
    const view = new Uint16Array(buffer);
    for (let index = 0; index < text.length; index++) {
      view[index] = text.charCodeAt(index);
    }
    await writeFile('/documents/foo.bin', buffer);
    expect(await readFile('/documents/foo.bin')).toBe('hello, world');

    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    expect(await idb.get(store, '/documents/foo.txt')).toEqual({
      filepath: '/documents/foo.txt',
      contents: 'hello',
    });

    await writeFile('/outside.txt', 'some junk');
    expect(await readFile('/outside.txt')).toBe('some junk');
    const { store: outsideStore } = idb.getStore(
      await idb.openDatabase(),
      'files',
    );
    expect(await idb.get(outsideStore, '/outside.txt')).toBe(undefined);

    await writeFile('/uploads/import.csv', new TextEncoder().encode('a,b'));
    expect(Array.from(await readFile('/uploads/import.csv', 'binary'))).toEqual(
      Array.from(new TextEncoder().encode('a,b')),
    );
  });

  it('routes sqlite files to the sqlite storage', async () => {
    await init();
    const bytes = await databaseBytes();

    await writeFile('/documents/Actual/b1/db.sqlite', bytes);
    expect(await exists('/documents/Actual/b1/db.sqlite')).toBe(true);
    expect(await listDir('/documents/Actual/b1')).toEqual(['db.sqlite']);

    const read = await readFile('/documents/Actual/b1/db.sqlite', 'binary');
    expect(Buffer.from(read).equals(Buffer.from(bytes))).toBe(true);

    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    const row = await idb.get(store, '/documents/Actual/b1/db.sqlite');
    expect(row?.storage).toBe('memory-idb');

    // The database opens through the engine
    const db = await sqlite.openDatabase('/documents/Actual/b1/db.sqlite');
    expect(sqlite.runQuery(db, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'x' },
    ]);
    sqlite.closeDatabase(db);
    // Let the close's write land before the next test resets IndexedDB
    await sleep(10);
  });

  it('copies databases between budgets and removes budget directories', async () => {
    await init();
    const bytes = await databaseBytes();
    await writeFile('/documents/Actual/b1/db.sqlite', bytes);
    await writeFile('/documents/Actual/b1/metadata.json', '{"id":"b1"}');

    await mkdir('/documents/Actual/b2');
    await copyFile(
      '/documents/Actual/b1/db.sqlite',
      '/documents/Actual/b2/db.sqlite',
    );
    await copyFile(
      '/documents/Actual/b1/metadata.json',
      '/documents/Actual/b2/metadata.json',
    );
    expect(await readFile('/documents/Actual/b2/metadata.json')).toBe(
      '{"id":"b1"}',
    );
    const copied = await readFile('/documents/Actual/b2/db.sqlite', 'binary');
    expect(Buffer.from(copied).equals(Buffer.from(bytes))).toBe(true);

    await removeDirRecursively('/documents/Actual/b1');
    expect(await exists('/documents/Actual/b1')).toBe(false);
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    expect(await idb.get(store, '/documents/Actual/b1/db.sqlite')).toBe(
      undefined,
    );
    expect(await idb.get(store, '/documents/Actual/b1/metadata.json')).toBe(
      undefined,
    );
    expect(await exists('/documents/Actual/b2/db.sqlite')).toBe(true);

    await removeFile('/documents/Actual/b2/metadata.json');
    await removeFile('/documents/Actual/b2/db.sqlite');
    await removeDir('/documents/Actual/b2');
    expect(await exists('/documents/Actual/b2')).toBe(false);
  });

  it('restores the hierarchy from IndexedDB keys, including sqlite markers', async () => {
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    await idb.set(store, {
      filepath: '/documents/ok.txt',
      contents: 'oh yeah',
    });
    await idb.set(store, {
      filepath: '/documents/deep/nested/file/ok.txt',
      contents: 'deeper',
    });
    await idb.set(store, {
      filepath: '/documents/deep/nested/db.sqlite',
      contents: '',
      storage: 'memory-idb',
    });

    await init();

    expect(await readFile('/documents/ok.txt')).toBe('oh yeah');
    expect(await exists('/documents/deep')).toBe(true);
    expect(await readFile('/documents/deep/nested/file/ok.txt')).toBe('deeper');
    expect(await exists('/documents/deep/nested/db.sqlite')).toBe(true);
    expect((await listDir('/documents/deep/nested')).sort()).toEqual([
      'db.sqlite',
      'file',
    ]);
  });

  it('retries a bundled file whose fetch failed instead of caching the error', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('default-db.sqlite\n'))
      .mockResolvedValueOnce(new Response('not here', { status: 404 }))
      .mockResolvedValueOnce(new Response(bytes));
    const environment = process.env.NODE_ENV;
    // The bundled files are only registered outside the test environment
    process.env.NODE_ENV = 'development';
    try {
      await init();
      await expect(readFile('/default-db.sqlite', 'binary')).rejects.toThrow(
        /404/,
      );
      expect(await readFile('/default-db.sqlite', 'binary')).toEqual(bytes);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    } finally {
      process.env.NODE_ENV = environment;
      fetchSpy.mockRestore();
    }
  });

  it('leaves a budget directory intact when any database in it cannot be removed', async () => {
    const dir = '/documents/Actual/held';
    await init();
    await mkdir(dir);
    await writeFile(dir + '/metadata.json', '{}');
    await writeFile(dir + '/db.sqlite', await databaseBytes());
    await mkdir(dir + '/backups');
    // A backup owned by OPFS, which this session cannot reach
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    await idb.set(store, {
      filepath: dir + '/backups/old.sqlite',
      contents: '',
      storage: 'opfs',
    });
    await init();

    await expect(removeDirRecursively(dir)).rejects.toThrow(/stored in OPFS/);
    expect(await exists(dir + '/metadata.json')).toBe(true);
    expect(await exists(dir + '/db.sqlite')).toBe(true);
    expect(await exists(dir + '/backups/old.sqlite')).toBe(true);
  });

  it('leaves a budget directory intact when the budget is open elsewhere', async () => {
    const dir = '/documents/Actual/held';
    await init();
    await mkdir(dir);
    await writeFile(dir + '/metadata.json', '{}');
    await writeFile(dir + '/db.sqlite', await databaseBytes());
    await mkdir(dir + '/backups');
    await writeFile(dir + '/backups/old.sqlite', await databaseBytes());
    // Another tab holds the budget's lock, though not the one of its backups
    const request = vi.fn(
      (name: string, _options: unknown, callback: () => Promise<void>) =>
        name === 'actual-budget:documents-Actual-held'
          ? Promise.reject(new DOMException('aborted', 'AbortError'))
          : callback(),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    try {
      await expect(removeDirRecursively(dir)).rejects.toBeInstanceOf(
        BudgetInUseError,
      );
    } finally {
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        configurable: true,
      });
    }
    expect(await exists(dir + '/backups/old.sqlite')).toBe(true);
    expect(await exists(dir + '/db.sqlite')).toBe(true);
    expect(await exists(dir + '/metadata.json')).toBe(true);
  });

  it('treats the temporary copy a backup makes as a database', async () => {
    const dir = '/documents/Actual/backed';
    await init();
    await mkdir(dir);
    await mkdir(dir + '/backups');
    await writeFile(dir + '/db.sqlite', await databaseBytes());
    const temporary = dir + '/backups/db.1.sqlite.tmp';
    await copyFile(dir + '/db.sqlite', temporary);
    // Held by the sqlite storage, so the engine opens the copy itself
    expect((await getSqliteFileRow(temporary))?.storage).toBe('memory-idb');
    const copy = await sqlite.openDatabase(temporary);
    expect(sqlite.runQuery(copy, 'SELECT v FROM t', [], true)).toEqual([
      { v: 'x' },
    ]);
    sqlite.closeDatabase(copy);
    await removeFile(temporary);
    expect(await exists(temporary)).toBe(false);
  });

  it('persists files under a custom document dir', async () => {
    await init();
    _setDocumentDir('/budget');
    expect(await exists('/budget')).toBe(true);

    await writeFile('/budget/foo.txt', 'hello');
    expect(await readFile('/budget/foo.txt')).toBe('hello');
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    expect(await idb.get(store, '/budget/foo.txt')).toEqual({
      filepath: '/budget/foo.txt',
      contents: 'hello',
    });
  });
});
