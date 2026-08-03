import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import * as idb from '#platform/server/indexeddb';

import {
  _setDocumentDir,
  bundledDatabasePath,
  copyFile,
  exists,
  getModifiedTime,
  init,
  listDir,
  mkdir,
  readFile,
  refreshPersistedHierarchy,
  removeDirRecursively,
  writeFile,
} from './index';

const sahState = vi.hoisted(() => ({
  databases: new Map<string, Uint8Array>(),
  shouldFailNextImport: false,
}));

vi.mock('#platform/server/sqlite', () => ({
  exportDatabasePath: async (path: string) => {
    const contents = sahState.databases.get(path);
    if (contents === undefined) {
      throw new Error(`Missing mocked database: ${path}`);
    }
    return contents.slice();
  },
  importDatabasePath: async (path: string, contents: Uint8Array) => {
    if (sahState.shouldFailNextImport) {
      sahState.shouldFailNextImport = false;
      throw new Error('Mocked import failure');
    }
    sahState.databases.set(path, contents.slice());
  },
  removeDatabasePath: async (path: string) => {
    sahState.databases.delete(path);
  },
}));

beforeEach(async () => {
  await idb.closeDatabase();
  global.indexedDB = new IDBFactory();
  await idb.openDatabase();

  sahState.databases.clear();
  sahState.shouldFailNextImport = false;
  process.env.PUBLIC_URL = '/';

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.endsWith('data-file-index.txt')) {
        return new Response('default-db.sqlite\n');
      }
      if (url.endsWith('data/default-db.sqlite')) {
        return new Response(new Uint8Array([1, 2, 3]));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await idb.closeDatabase();
});

describe('browser filesystem', () => {
  it('routes persisted database files through the SAH pool', async () => {
    await init();
    _setDocumentDir('/documents/Actual');

    const budgetDir = '/documents/Actual/budget';
    const databasePath = `${budgetDir}/db.sqlite`;
    const temporaryDatabasePath = `${budgetDir}/db.123.sqlite.tmp`;

    await mkdir(budgetDir);
    await writeFile(`${budgetDir}/metadata.json`, '{"id":"budget"}');
    await copyFile(bundledDatabasePath, databasePath);
    await copyFile(databasePath, temporaryDatabasePath);

    expect(await readFile(databasePath, 'binary')).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(new Set(await listDir(budgetDir))).toEqual(
      new Set(['metadata.json', 'db.sqlite', 'db.123.sqlite.tmp']),
    );
    expect([...sahState.databases.keys()]).toEqual([
      databasePath,
      temporaryDatabasePath,
    ]);

    await removeDirRecursively(budgetDir);

    expect(await exists(budgetDir)).toBe(false);
    expect(sahState.databases.size).toBe(0);
  });

  it('uses an existing database marker without changing its storage record', async () => {
    const databasePath = '/documents/Actual/budget/db.sqlite';
    const database = await idb.openDatabase();
    const { store } = idb.getStore(database, 'files');
    await idb.set(store, { filepath: databasePath, contents: '' });
    sahState.databases.set(databasePath, new Uint8Array([1, 2, 3]));

    await init();
    _setDocumentDir('/documents/Actual');

    await expect(readFile(databasePath, 'binary')).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
    await expect(
      idb.get(idb.getStore(database, 'files').store, databasePath),
    ).resolves.toMatchObject({ filepath: databasePath, contents: '' });
  });

  it('checks a database marker lazily when its OPFS database is read', async () => {
    const databasePath = '/documents/Actual/budget/db.sqlite';
    const database = await idb.openDatabase();
    await idb.set(idb.getStore(database, 'files').store, {
      filepath: databasePath,
      contents: '',
    });

    await init();
    _setDocumentDir('/documents/Actual');

    await expect(readFile(databasePath, 'binary')).rejects.toThrow(
      `Missing mocked database: ${databasePath}`,
    );
  });

  it('keeps file and directory paths mutually exclusive', async () => {
    await init();
    _setDocumentDir('/documents/Actual');

    await mkdir('/documents/Actual/budget');

    await expect(mkdir('/documents/Actual/budget')).rejects.toThrow(
      'Path already exists',
    );
    await expect(
      writeFile('/documents/Actual/budget', 'not a directory'),
    ).rejects.toThrow('Path is already a directory');
    await expect(
      writeFile('/documents/Actual/missing/metadata.json', '{}'),
    ).rejects.toThrow('Parent directory does not exist');
  });

  it('does not write a database marker when an import fails', async () => {
    await init();
    _setDocumentDir('/documents/Actual');
    const budgetDir = '/documents/Actual/budget';
    const databasePath = `${budgetDir}/db.sqlite`;
    await mkdir(budgetDir);
    sahState.shouldFailNextImport = true;
    await expect(
      writeFile(databasePath, new Uint8Array([4, 5, 6])),
    ).rejects.toThrow('Mocked import failure');

    const database = await idb.openDatabase();
    await expect(
      idb.get(idb.getStore(database, 'files').store, databasePath),
    ).resolves.toBeUndefined();
  });

  it('can delete a budget whose database bytes are already missing', async () => {
    const budgetDir = '/documents/Actual/budget';
    const databasePath = `${budgetDir}/db.sqlite`;
    const database = await idb.openDatabase();
    const { store } = idb.getStore(database, 'files');
    await idb.set(store, { filepath: databasePath, contents: '' });
    await idb.set(store, {
      filepath: `${budgetDir}/metadata.json`,
      contents: '{}',
    });

    await init();
    _setDocumentDir('/documents/Actual');
    await removeDirRecursively(budgetDir);

    expect(await exists(budgetDir)).toBe(false);
  });

  it('preserves the order of legacy backups without stored mtimes', async () => {
    const first = '/documents/Actual/budget/backups/2025-01-02_03-04-05.zip';
    const second = '/documents/Actual/budget/backups/2025-02-03_04-05-06.zip';
    const database = await idb.openDatabase();
    await idb.set(idb.getStore(database, 'files').store, {
      filepath: first,
      contents: new Uint8Array(),
    });
    await idb.set(idb.getStore(database, 'files').store, {
      filepath: second,
      contents: new Uint8Array(),
    });

    await init();
    _setDocumentDir('/documents/Actual');

    expect((await getModifiedTime(first)).getTime()).toBeLessThan(
      (await getModifiedTime(second)).getTime(),
    );
  });

  it('refreshes budgets created and deleted by another backend Worker', async () => {
    await init();
    _setDocumentDir('/documents/Actual');

    const budgetDir = '/documents/Actual/other-worker-budget';
    const databasePath = `${budgetDir}/db.sqlite`;
    const metadataPath = `${budgetDir}/metadata.json`;
    const database = await idb.openDatabase();
    await idb.set(idb.getStore(database, 'files').store, {
      filepath: metadataPath,
      contents: '{"budgetName":"Other Worker"}',
    });
    await idb.set(idb.getStore(database, 'files').store, {
      filepath: databasePath,
      contents: '',
    });

    await refreshPersistedHierarchy();

    expect(await listDir('/documents/Actual')).toContain('other-worker-budget');
    await expect(readFile(metadataPath)).resolves.toBe(
      '{"budgetName":"Other Worker"}',
    );

    await idb.del(idb.getStore(database, 'files').store, metadataPath);
    await idb.del(idb.getStore(database, 'files').store, databasePath);
    await refreshPersistedHierarchy();

    expect(await listDir('/documents/Actual')).not.toContain(
      'other-worker-budget',
    );
  });
});
