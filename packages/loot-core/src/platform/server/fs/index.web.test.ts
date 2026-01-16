// @ts-strict-ignore
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { patchFetchForSqlJS } from '../../../mocks/util';
import * as idb from '../indexeddb';
import * as sqlite from '../sqlite';

import { exists, init, join, pathToId, readFile, writeFile } from './index';

beforeAll(() => {
  const baseURL = `${__dirname}/../../../../../../node_modules/@jlongster/sql.js/dist/`;
  patchFetchForSqlJS(baseURL);
  process.env.PUBLIC_URL = baseURL;
});

beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

afterEach(() => {
  sqlite._getModule().reset_filesystem();
});

describe('web filesystem', () => {
  test('basic reads/writes are stored in idb', async () => {
    await idb.openDatabase();
    await sqlite.init();
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
    const { store } = await idb.getStore(db, 'files');

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

  test('writing to sqlite files creates symlinks', async () => {
    await idb.openDatabase();
    await sqlite.init();
    await init();

    await writeFile('/documents/db.sqlite', 'some junk');

    expect(await readFile('/documents/db.sqlite')).toBe('some junk');
    expect(await readFile('/blocked/' + pathToId('/documents/db.sqlite'))).toBe(
      'some junk',
    );
  });

  test('files are restored from idb', async () => {
    const db = await idb.openDatabase();
    const { store } = await idb.getStore(db, 'files');
    idb.set(store, { filepath: '/documents/ok.txt', contents: 'oh yeah' });
    idb.set(store, {
      filepath: '/documents/deep/nested/file/ok.txt',
      contents: 'deeper',
    });
    idb.set(store, {
      filepath: '/documents/deep/nested/db.sqlite',
      contents: 'this will be blank and just create a symlink',
    });

    await sqlite.init();
    await init();

    expect(await readFile('/documents/ok.txt')).toBe('oh yeah');
    expect(await exists('/documents/deep')).toBe(true);
    expect(await readFile('/documents/deep/nested/file/ok.txt')).toBe('deeper');

    const FS = sqlite._getModule().FS;
    const { node } = FS.lookupPath('/documents/deep/nested/db.sqlite', {});
    expect(node.link).toBe(
      '/blocked/' + pathToId('/documents/deep/nested/db.sqlite'),
    );
  });
});

describe('join', () => {
  test('basic join works', () => {
    expect(join('foo', 'bar')).toBe('foo/bar');
    expect(join('/foo', 'bar')).toBe('/foo/bar');
    expect(join('/foo', '../bar')).toBe('/bar');
  });
});
