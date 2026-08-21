import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { _setDocumentDir } from '#platform/server/fs/shared';

import {
  closeDatabase,
  importDatabasePath,
  init,
  openDatabase,
  removeDatabasePath,
} from './index';

type PoolOptions = {
  directory: string;
  initialCapacity: number;
  name: string;
};

const poolState = vi.hoisted(() => ({
  installs: [] as PoolOptions[],
  installFailures: 0,
  pools: new Map<string, ReturnType<typeof createPool>>(),
  pendingInstall: null as Promise<ReturnType<typeof createPool>> | null,
  invalidPaths: new Set<string>(),
  invalidAfterImportPaths: new Set<string>(),
  importCounts: new Map<string, number>(),
}));

function createPool(directory: string) {
  const files = new Map<string, Uint8Array>();
  let paused = false;
  const pool = {
    files,
    pauseCount: 0,
    unpauseCount: 0,
    getFileNames: () => [...files.keys()],
    importDb: async (
      path: string,
      input: Uint8Array | (() => Promise<Uint8Array | undefined>),
    ) => {
      const chunks: Uint8Array[] = [];
      if (typeof input === 'function') {
        while (true) {
          const chunk = await input();
          if (chunk === undefined) {
            break;
          }
          chunks.push(chunk);
        }
      } else {
        chunks.push(input);
      }
      const byteLength = chunks.reduce(
        (total, chunk) => total + chunk.byteLength,
        0,
      );
      const contents = new Uint8Array(byteLength);
      let offset = 0;
      for (const chunk of chunks) {
        contents.set(chunk, offset);
        offset += chunk.byteLength;
      }
      files.set(path, contents);
      poolState.importCounts.set(
        path,
        (poolState.importCounts.get(path) ?? 0) + 1,
      );
      if (!poolState.invalidAfterImportPaths.has(path)) {
        poolState.invalidPaths.delete(path);
      }
      return contents.byteLength;
    },
    unlink: (path: string) => files.delete(path),
    isPaused: () => paused,
    pauseVfs: () => {
      paused = true;
      pool.pauseCount++;
      return pool;
    },
    unpauseVfs: async () => {
      paused = false;
      pool.unpauseCount++;
      return pool;
    },
    OpfsSAHPoolDb: class {
      #isOpen = true;
      constructor(public filename: string) {}
      exec() {
        return undefined;
      }
      selectValue(sql: string) {
        if (sql.includes('journal_mode')) {
          return 'wal';
        }
        return poolState.invalidPaths.has(this.filename) ? 'corrupt' : 'ok';
      }
      createFunction() {
        return undefined;
      }
      isOpen() {
        return this.#isOpen;
      }
      close() {
        this.#isOpen = false;
      }
    },
  };
  poolState.pools.set(directory, pool);
  return pool;
}

vi.mock('#platform/server/sqlite/sqlite-module', () => ({
  loadSqliteInitModule: async () => async () => ({
    installOpfsSAHPoolVfs: async (options: PoolOptions) => {
      poolState.installs.push(options);
      if (poolState.installFailures-- > 0) {
        throw new Error('pool busy');
      }
      if (poolState.pendingInstall !== null) {
        return await poolState.pendingInstall;
      }
      return createPool(options.directory);
    },
    oo1: { DB: class {} },
    capi: {},
    wasm: {},
  }),
}));

beforeAll(async () => {
  vi.stubGlobal('FileSystemHandle', class {});
  vi.stubGlobal('FileSystemDirectoryHandle', class {});
  vi.stubGlobal(
    'FileSystemFileHandle',
    class {
      createSyncAccessHandle() {
        return undefined;
      }
    },
  );
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { getDirectory: vi.fn() },
  });
  await init();
});

beforeEach(() => {
  global.indexedDB = new IDBFactory();
  _setDocumentDir('/documents/Actual');
  poolState.installFailures = 0;
  poolState.pendingInstall = null;
  poolState.invalidPaths.clear();
  poolState.invalidAfterImportPaths.clear();
  poolState.importCounts.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

async function seedLegacyDatabase(path: string, contents: Uint8Array) {
  const name = path.replace(/^\//, '').replaceAll('/', '-');
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 2);
    request.onupgradeneeded = () => request.result.createObjectStore('data');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = database.transaction('data', 'readwrite');
  const store = transaction.objectStore('data');
  store.put({ size: contents.byteLength }, -1);
  for (let offset = 0; offset < contents.byteLength; offset += 512) {
    store.put(contents.slice(offset, offset + 512).buffer, offset / 512);
  }
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return name;
}

function legacyContents(marker: number) {
  const contents = new Uint8Array(1024).fill(marker);
  contents.set(new TextEncoder().encode('SQLite format 3\0'));
  contents[16] = 2;
  contents[17] = 0;
  return contents;
}

async function expectLegacyDatabase(name: string, exists: boolean) {
  const names = (await indexedDB.databases()).map(database => database.name);
  expect(names.includes(name)).toBe(exists);
}

describe('per-budget SAH pools', () => {
  it('reuses one lazy pool for every database path in a budget', async () => {
    const first = '/documents/Actual/reuse-budget/db.sqlite';
    const second = '/documents/Actual/reuse-budget/db.sqlite.tmp';

    await importDatabasePath(first, new Uint8Array([1]));
    await importDatabasePath(second, new Uint8Array([2]));

    const installs = poolState.installs.filter(
      install => install.directory === '.actual-budget/reuse-budget',
    );
    expect(installs).toHaveLength(1);
    expect(installs[0]).toMatchObject({ initialCapacity: 16 });
    expect(poolState.pools.get(installs[0].directory)?.files.keys()).toContain(
      first,
    );
    expect(poolState.pools.get(installs[0].directory)?.files.keys()).toContain(
      second,
    );
  });

  it('uses independent directories for independent budgets', async () => {
    await Promise.all([
      importDatabasePath(
        '/documents/Actual/first-budget/db.sqlite',
        new Uint8Array([1]),
      ),
      importDatabasePath(
        '/documents/Actual/second-budget/db.sqlite',
        new Uint8Array([2]),
      ),
    ]);

    expect(poolState.pools.has('.actual-budget/first-budget')).toBe(true);
    expect(poolState.pools.has('.actual-budget/second-budget')).toBe(true);
  });

  it('shares an in-flight activation and pauses after the last operation', async () => {
    let finishInstall!: (pool: ReturnType<typeof createPool>) => void;
    poolState.pendingInstall = new Promise(resolve => {
      finishInstall = resolve;
    });
    const first = importDatabasePath(
      '/documents/Actual/concurrent-budget/db.sqlite',
      new Uint8Array([1]),
    );
    const second = importDatabasePath(
      '/documents/Actual/concurrent-budget/db.sqlite.tmp',
      new Uint8Array([2]),
    );
    await vi.waitFor(() => {
      expect(
        poolState.installs.filter(
          install => install.directory === '.actual-budget/concurrent-budget',
        ),
      ).toHaveLength(1);
    });

    const pool = createPool('.actual-budget/concurrent-budget');
    finishInstall(pool);
    await Promise.all([first, second]);

    expect(pool.pauseCount).toBe(1);
  });

  it('keeps a pool active while its database is open', async () => {
    const path = '/documents/Actual/open-budget/db.sqlite';
    await importDatabasePath(path, new Uint8Array([1]));
    const pool = poolState.pools.get('.actual-budget/open-budget');
    expect(pool?.pauseCount).toBe(1);
    const pausesBeforeOpen = pool?.pauseCount ?? 0;
    const unpausesBeforeOpen = pool?.unpauseCount ?? 0;

    const database = await openDatabase(path);
    // Migration checks acquire and release an operation reference, then the
    // live database keeps the next acquisition active.
    expect(pool?.unpauseCount).toBe(unpausesBeforeOpen + 2);
    expect(pool?.pauseCount).toBe(pausesBeforeOpen + 1);

    closeDatabase(database);
    expect(pool?.pauseCount).toBe(pausesBeforeOpen + 2);
  });

  it('keeps a valid pooled database after an interrupted legacy migration', async () => {
    const path = '/documents/Actual/valid-interrupted/db.sqlite';
    await importDatabasePath(path, new Uint8Array([1]));
    const legacyName = await seedLegacyDatabase(path, legacyContents(42));

    const database = await openDatabase(path);
    closeDatabase(database);

    expect(poolState.importCounts.get(path)).toBe(1);
    await expectLegacyDatabase(legacyName, false);
  });

  it('reimports an invalid pooled candidate from retained legacy blocks', async () => {
    const path = '/documents/Actual/invalid-interrupted/db.sqlite';
    await importDatabasePath(path, new Uint8Array([1]));
    poolState.invalidPaths.add(path);
    const expected = legacyContents(73);
    const legacyName = await seedLegacyDatabase(path, expected);

    const database = await openDatabase(path);
    closeDatabase(database);

    expect(poolState.importCounts.get(path)).toBe(2);
    expect(
      poolState.pools
        .get('.actual-budget/invalid-interrupted')
        ?.files.get(path),
    ).toEqual(expected);
    await expectLegacyDatabase(legacyName, false);
  });

  it('removes a failed migration candidate and retains legacy data', async () => {
    const path = '/documents/Actual/failed-migration/db.sqlite';
    const legacyName = await seedLegacyDatabase(path, legacyContents(91));
    poolState.invalidPaths.add(path);
    poolState.invalidAfterImportPaths.add(path);

    await expect(openDatabase(path)).rejects.toThrow('quick_check failed');

    expect(
      poolState.pools.get('.actual-budget/failed-migration')?.files.has(path),
    ).toBe(false);
    await expectLegacyDatabase(legacyName, true);
  });

  it('deletes an unmigrated legacy database without importing it', async () => {
    const path = '/documents/Actual/delete-unmigrated/db.sqlite';
    const legacyName = await seedLegacyDatabase(path, legacyContents(18));

    await removeDatabasePath(path);

    expect(poolState.importCounts.has(path)).toBe(false);
    await expectLegacyDatabase(legacyName, false);
  });

  it('retries transient contention with a new VFS name', async () => {
    poolState.installFailures = 2;
    await importDatabasePath(
      '/documents/Actual/retry-budget/db.sqlite',
      new Uint8Array([1]),
    );

    const installs = poolState.installs.filter(
      install => install.directory === '.actual-budget/retry-budget',
    );
    expect(installs).toHaveLength(3);
    expect(new Set(installs.map(install => install.name))).toHaveLength(3);
  });

  it('fails clearly after permanent contention without a memory fallback', async () => {
    vi.useFakeTimers();
    poolState.installFailures = 5;
    const importPromise = importDatabasePath(
      '/documents/Actual/busy-budget/db.sqlite',
      new Uint8Array([1]),
    );
    const expectation = expect(importPromise).rejects.toThrow(
      'opfs-sahpool-budget-in-use',
    );

    await vi.runAllTimersAsync();
    await expectation;
    expect(
      poolState.installs.filter(
        install => install.directory === '.actual-budget/busy-budget',
      ),
    ).toHaveLength(5);
    expect(poolState.pools.has('.actual-budget/busy-budget')).toBe(false);
  });
});
