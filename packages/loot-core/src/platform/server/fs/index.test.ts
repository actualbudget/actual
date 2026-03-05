import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import * as idb from '../indexeddb';
import * as sqlite from '../sqlite';

import { exists, init, join, readFile, writeFile } from './index';

beforeAll(async () => {
  return sqlite.init();
});

beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

describe('web filesystem', () => {
  test('basic reads/writes are stored in idb', async () => {
    await idb.openDatabase();
    await init();

    // Text file
    await writeFile('/documents/foo.txt', 'hello');
    expect(await readFile('/documents/foo.txt')).toBe('hello');

    // Binary file
    const str = 'hello, world';
    const buf = new ArrayBuffer(str.length * 2);
    const view = new Uint16Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      view[i] = str.charCodeAt(i);
    }

    await writeFile('/documents/foo.bin', buf);
    expect(await readFile('/documents/foo.bin')).toBe('hello, world');

    const db = await idb.openDatabase();
    const { store } = idb.getStore(db, 'files');

    // Make sure they are in idb
    expect(await idb.get(store, '/documents/foo.txt')).toEqual({
      filepath: '/documents/foo.txt',
      contents: 'hello',
    });
    const binResult = await idb.get(store, '/documents/foo.bin');
    expect(binResult.filepath).toBe('/documents/foo.bin');
    expect(Array.from(binResult.contents)).toEqual(
      Array.from(new Uint8Array(buf)),
    );

    // Write a file outside of documents
    await writeFile('/outside.txt', 'some junk');
    expect(await readFile('/outside.txt')).toBe('some junk');
    expect(await idb.get(store, '/outside.txt')).toBe(undefined);

    await idb.closeDatabase();
  });

  test('writing to sqlite files records in IDB metadata', async () => {
    await idb.openDatabase();
    await init();

    await writeFile('/documents/db.sqlite', 'some junk');

    // Verify IDB has the metadata entry
    const db = await idb.openDatabase();
    const { store } = idb.getStore(db, 'files');
    const entry = await idb.get(store, '/documents/db.sqlite');
    expect(entry).toBeDefined();
    expect(entry.filepath).toBe('/documents/db.sqlite');
    await idb.closeDatabase();
  });

  test('files are restored from idb', async () => {
    const db = await idb.openDatabase();
    const { store } = idb.getStore(db, 'files');
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
    });

    await init();

    expect(await readFile('/documents/ok.txt')).toBe('oh yeah');
    expect(await exists('/documents/deep')).toBe(true);
    expect(await readFile('/documents/deep/nested/file/ok.txt')).toBe('deeper');
    // The sqlite file should be tracked (visible via exists)
    expect(await exists('/documents/deep/nested/db.sqlite')).toBe(true);
  });
});

describe('join', () => {
  test('basic join works', () => {
    expect(join('foo', 'bar')).toBe('foo/bar');
    expect(join('/foo', 'bar')).toBe('/foo/bar');
    expect(join('/foo', '../bar')).toBe('/bar');
  });
});
