import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { patchFetchForSqlJS } from '#mocks/util';
import * as idb from '#platform/server/indexeddb';
import * as sqlite from '#platform/server/sqlite';
import { StorageUnavailableError } from '#platform/server/sqlite/storage/errors';
import { parseRateCsv } from '#server/exchange-rates/import-csv';

import {
  _setDocumentDir,
  exists,
  init,
  join,
  pathToId,
  readFile,
  removeDirRecursively,
  removeFile,
  writeFile,
} from './index';

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
  test('refuses to change a database another worker moved', async () => {
    const dir = '/documents/Actual/moved';
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    await idb.set(store, { filepath: dir + '/metadata.json', contents: '{}' });
    await idb.set(store, { filepath: dir + '/db.sqlite', contents: '' });
    await sqlite.init();
    await init();
    // Another worker moves the budget to the new storage after this one
    // started on the legacy engine
    const { store: later } = idb.getStore(await idb.openDatabase(), 'files');
    await idb.set(later, {
      filepath: dir + '/db.sqlite',
      contents: '',
      storage: 'opfs',
    });

    await expect(
      writeFile(dir + '/db.sqlite', new Uint8Array([1])),
    ).rejects.toBeInstanceOf(StorageUnavailableError);
    await expect(removeFile(dir + '/db.sqlite')).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    // The directory is refused as a whole, nothing half deleted
    await expect(removeDirRecursively(dir)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    expect(await exists(dir + '/metadata.json')).toBe(true);
    const { store: after } = idb.getStore(await idb.openDatabase(), 'files');
    expect((await idb.get(after, dir + '/db.sqlite'))?.storage).toBe('opfs');
    // The connection is shared across tests: leave no marker behind
    await idb.del(after, dir + '/db.sqlite');
  });

  test('holds every budget in a directory before removing any of it', async () => {
    const dir = '/documents/Actual/held';
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    await idb.set(store, { filepath: dir + '/metadata.json', contents: '{}' });
    await idb.set(store, { filepath: dir + '/db.sqlite', contents: '' });
    await idb.set(store, {
      filepath: dir + '/backups/old.sqlite',
      contents: '',
    });
    await sqlite.init();
    await init();
    // A Web Locks API that grants and records
    const request = vi.fn(
      (_name: string, _options: unknown, callback: () => Promise<void>) =>
        callback(),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    const delSpy = vi.spyOn(idb, 'del');
    try {
      await removeDirRecursively(dir);
    } finally {
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        configurable: true,
      });
    }
    expect(await exists(dir)).toBe(false);
    // The budget's own lock was taken before the first row went, not only
    // when its database's turn came in the walk
    const budgetLock = request.mock.calls.findIndex(
      call => call[0] === 'actual-budget:documents-Actual-held',
    );
    expect(budgetLock).toBeGreaterThanOrEqual(0);
    expect(request.mock.invocationCallOrder[budgetLock]).toBeLessThan(
      delSpy.mock.invocationCallOrder[0],
    );
    // And taken once: the walk underneath requests no lock of its own
    expect(
      request.mock.calls.filter(
        call => call[0] === 'actual-budget:documents-Actual-held',
      ),
    ).toHaveLength(1);
    delSpy.mockRestore();
  });

  test('checks a database that appears during the removal walk', async () => {
    const dir = '/documents/Actual/late';
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    await idb.set(store, { filepath: dir + '/a-first.json', contents: '{}' });
    await idb.set(store, {
      filepath: dir + '/backups/old.sqlite',
      contents: '',
    });
    await idb.set(store, { filepath: dir + '/db.sqlite', contents: '' });
    await sqlite.init();
    await init();
    const request = vi.fn(
      (_name: string, _options: unknown, callback: () => Promise<void>) =>
        callback(),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    const originalDel = idb.del;
    const late = dir + '/backups/late.sqlite';
    const delSpy = vi
      .spyOn(idb, 'del')
      .mockImplementationOnce(async (target, key) => {
        // The real delete goes first, while its transaction is still live
        const deleted = originalDel(target, key);
        // While the first file goes, a database appears further down the
        // tree, and another worker moves it to the new storage
        await writeFile(late, new Uint8Array([1]));
        const { store: rows } = idb.getStore(await idb.openDatabase(), 'files');
        await idb.set(rows, { filepath: late, contents: '', storage: 'opfs' });
        return deleted;
      });
    try {
      await expect(removeDirRecursively(dir)).rejects.toBeInstanceOf(
        StorageUnavailableError,
      );
    } finally {
      delSpy.mockRestore();
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        configurable: true,
      });
    }
    const { store: after } = idb.getStore(await idb.openDatabase(), 'files');
    expect((await idb.get(after, late))?.storage).toBe('opfs');
    // The connection is shared across tests: leave no marker behind
    await idb.del(after, late);
  });

  test('reads UTF-8 CSV bytes for a manual-rate import without converting them to text', async () => {
    await idb.openDatabase();
    await sqlite.init();
    await init();
    const bytes = new TextEncoder().encode(
      '\uFEFFquote_currency,rate,kind,date\r\nEUR,0.9200,standing,2026-02-28\r\n',
    );
    await writeFile('/documents/rates.csv', bytes);
    const actual = await readFile('/documents/rates.csv', 'binary');
    expect(Array.from(actual)).toEqual(Array.from(bytes));
    expect(parseRateCsv(actual, 'USD')).toMatchObject({
      status: 'ok',
      rows: [{ class: 'new', quote: 'EUR', rate: '0.92' }],
    });
  });

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
    const { store } = idb.getStore(db, 'files');

    // Make sure they are in idb
    expect(await idb.get(store, '/documents/foo.txt')).toEqual({
      filepath: '/documents/foo.txt',
      contents: 'hello',
    });
    const binResult = await idb.get(store, '/documents/foo.bin');
    expect(binResult?.filepath).toBe('/documents/foo.bin');
    expect(Array.from(binResult?.contents as Uint8Array)).toEqual(
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

  test('files under a custom document dir are persisted', async () => {
    await idb.openDatabase();
    await sqlite.init();
    await init();

    _setDocumentDir('/budget');

    expect(await exists('/budget')).toBe(true);

    await writeFile('/budget/foo.txt', 'hello');
    expect(await readFile('/budget/foo.txt')).toBe('hello');

    const db = await idb.openDatabase();
    const { store } = idb.getStore(db, 'files');
    expect(await idb.get(store, '/budget/foo.txt')).toEqual({
      filepath: '/budget/foo.txt',
      contents: 'hello',
    });

    // sqlite files are symlinked into the blocked fs
    await writeFile('/budget/db.sqlite', 'some junk');
    expect(await readFile('/blocked/' + pathToId('/budget/db.sqlite'))).toBe(
      'some junk',
    );

    await idb.closeDatabase();
  });

  test('files under a custom document dir are restored from idb', async () => {
    const db = await idb.openDatabase();
    const { store } = idb.getStore(db, 'files');
    await idb.set(store, {
      filepath: '/custom/xyz/metadata.json',
      contents: '{"id":"xyz"}',
    });
    await idb.set(store, {
      filepath: '/custom/xyz/db.sqlite',
      contents: 'this will be blank and just create a symlink',
    });

    await sqlite.init();
    await init();
    _setDocumentDir('/custom');

    expect(await readFile('/custom/xyz/metadata.json')).toBe('{"id":"xyz"}');

    const FS = sqlite._getModule().FS;
    const { node } = FS.lookupPath('/custom/xyz/db.sqlite', {});
    expect(node.link).toBe('/blocked/' + pathToId('/custom/xyz/db.sqlite'));
  });
});

describe('join', () => {
  test('basic join works', () => {
    expect(join('foo', 'bar')).toBe('foo/bar');
    expect(join('/foo', 'bar')).toBe('/foo/bar');
    expect(join('/foo', '../bar')).toBe('/bar');
  });
});
