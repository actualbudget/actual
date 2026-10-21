import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import * as idb from '#platform/server/indexeddb';
import * as sqlite from '#platform/server/sqlite';
import {
  readSqliteWasm,
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

beforeAll(() =>
  sqlite.init({ storage: 'memory-idb', wasmBinary: readSqliteWasm() }),
);

beforeEach(async () => {
  global.indexedDB = new IDBFactory();
  await idb.closeDatabase();
  void idb.openDatabase();
});

async function databaseBytes(): Promise<Uint8Array> {
  const db = await sqlite.openDatabase();
  sqlite.execQuery(db, "CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('x');");
  const bytes = await sqlite.exportDatabase(db);
  sqlite.closeDatabase(db);
  return bytes;
}

describe('web filesystem (sqlite-wasm storage)', () => {
  it('stores persisted files in IndexedDB and transient files in memory', async () => {
    await init({ storage: 'memory-idb' });

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
    await init({ storage: 'memory-idb' });
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
    await sleep(10);
  });

  it('copies databases between budgets and removes budget directories', async () => {
    await init({ storage: 'memory-idb' });
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

    await init({ storage: 'memory-idb' });

    expect(await readFile('/documents/ok.txt')).toBe('oh yeah');
    expect(await exists('/documents/deep')).toBe(true);
    expect(await readFile('/documents/deep/nested/file/ok.txt')).toBe('deeper');
    expect(await exists('/documents/deep/nested/db.sqlite')).toBe(true);
    expect((await listDir('/documents/deep/nested')).sort()).toEqual([
      'db.sqlite',
      'file',
    ]);
  });

  it('persists files under a custom document dir', async () => {
    await init({ storage: 'memory-idb' });
    _setDocumentDir('/budget');
    expect(await exists('/budget')).toBe(true);

    await writeFile('/budget/foo.txt', 'hello');
    expect(await readFile('/budget/foo.txt')).toBe('hello');
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    expect(await idb.get(store, '/budget/foo.txt')).toEqual({
      filepath: '/budget/foo.txt',
      contents: 'hello',
    });

    await writeFile('/budget/db.sqlite', await databaseBytes());
    const { store: sqliteStore } = idb.getStore(
      await idb.openDatabase(),
      'files',
    );
    expect((await idb.get(sqliteStore, '/budget/db.sqlite'))?.storage).toBe(
      'memory-idb',
    );
  });
});
