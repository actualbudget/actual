import type { SAHPoolUtil, Sqlite3Static } from '@sqlite.org/sqlite-wasm';

import { logger } from '#platform/server/log';
import { exportBytes, getSqlite3 } from '#platform/server/sqlite/wasm';
import type { WasmDatabase } from '#platform/server/sqlite/wasm';

import {
  deleteLegacyDatabase,
  openLegacyDatabaseContents,
} from './absurd-migration';
import { BudgetInUseError, StorageMigrationError } from './errors';
import {
  deleteSqliteFileRow,
  getSqliteFileRow,
  putSqliteFileRow,
} from './files-store';
import { acquireWebLock } from './locks';
import { legacyDatabaseName, splitSqlitePath } from './paths';
import type { MigrationProgress, OpenOptions, SqliteFileStore } from './types';

// Primary web storage: SQLite's own `opfs-sahpool` VFS, one pool per
// budget directory so budgets can be open in different tabs at once. A
// pool holds the sqlite file plus its journal in pre-opened OPFS access
// handles, which are exclusive; a Web Lock per pool makes the conflict
// explicit instead of a failed install.

export const POOL_ROOT = 'actual/pools';
const LOCK_TIMEOUT_MS = 10_000;
const INSTALL_DELAYS_MS = [0, 100, 250, 500, 1000, 2000, 3000];
// `preserveOnInitFailure` arrived in 3.54; without it a failed install
// deletes the pool directory, which is never acceptable for user data
export const MIN_SQLITE_VERSION = 3054000;

type PoolOptions = Parameters<Sqlite3Static['installOpfsSAHPoolVfs']>[0] & {
  preserveOnInitFailure?: boolean;
  forceReinitIfPreviouslyFailed?: boolean;
};

type Pool = {
  dirId: string;
  util: SAHPoolUtil;
  open: Map<string, WasmDatabase>;
  releaseLock: (() => void) | null;
};

export type OpfsStoreDependencies = {
  sqlite3: () => Sqlite3Static;
  acquireLock: (name: string, timeoutMs: number) => Promise<() => void>;
  onMigrationProgress?: MigrationProgress;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

export function applyFilePragmas(db: WasmDatabase) {
  db.exec(`
    PRAGMA locking_mode=EXCLUSIVE;
    PRAGMA journal_mode=TRUNCATE;
    PRAGMA synchronous=NORMAL;
    PRAGMA temp_store=MEMORY;
    PRAGMA cache_size=-64000;
  `);
}

export function createOpfsStore({
  sqlite3 = getSqlite3,
  acquireLock = acquireWebLock,
  onMigrationProgress,
  sleep = defaultSleep,
}: Partial<OpfsStoreDependencies> = {}): SqliteFileStore {
  const pools = new Map<string, Pool>();

  async function installPool(dirId: string): Promise<SAHPoolUtil> {
    const api = sqlite3();
    if (api.version.libVersionNumber < MIN_SQLITE_VERSION) {
      throw new Error(
        `sqlite-wasm ${api.version.libVersion} is too old for OPFS pools`,
      );
    }
    let lastError: unknown;
    for (let attempt = 0; attempt < INSTALL_DELAYS_MS.length; attempt++) {
      if (INSTALL_DELAYS_MS[attempt] > 0) {
        await sleep(INSTALL_DELAYS_MS[attempt]);
      }
      const options: PoolOptions = {
        name: `actual-${dirId}`,
        directory: `${POOL_ROOT}/${dirId}`,
        initialCapacity: 6,
        clearOnInit: false,
        preserveOnInitFailure: true,
        forceReinitIfPreviouslyFailed: attempt > 0,
      };
      try {
        return await api.installOpfsSAHPoolVfs(options);
      } catch (error) {
        // Typically the previous worker's handles are still being released
        lastError = error;
      }
    }
    throw lastError;
  }

  // Holds the lock and live handles for a pool until `release`
  async function acquire(dirId: string, path: string): Promise<Pool> {
    const existing = pools.get(dirId);
    if (existing?.releaseLock) {
      return existing;
    }
    const releaseLock = await acquireLock(
      'actual-budget:' + dirId,
      LOCK_TIMEOUT_MS,
    ).catch(() => {
      throw new BudgetInUseError(path);
    });
    try {
      if (existing) {
        if (existing.util.isPaused()) {
          await existing.util.unpauseVfs();
        }
        existing.releaseLock = releaseLock;
        return existing;
      }
      const util = await installPool(dirId);
      const pool: Pool = { dirId, util, open: new Map(), releaseLock };
      pools.set(dirId, pool);
      return pool;
    } catch (error) {
      releaseLock();
      if (
        error instanceof Error &&
        /lock|NoModificationAllowed/i.test(error.name + error.message)
      ) {
        throw new BudgetInUseError(path);
      }
      throw error;
    }
  }

  function release(pool: Pool) {
    if (pool.open.size > 0 || !pool.releaseLock) {
      return;
    }
    try {
      pool.util.pauseVfs();
    } catch (error) {
      logger.warn('sqlite storage: could not pause pool', pool.dirId, error);
    }
    pool.releaseLock();
    pool.releaseLock = null;
  }

  // `quick_check` plus the migrations table: catches a truncated or
  // foreign file before the import is committed
  function verifyImported(pool: Pool, fileName: string) {
    const db = new (sqlite3().oo1.DB)({
      filename: fileName,
      flags: 'w',
      vfs: pool.util.vfsName,
    });
    try {
      const result = db.selectValue('PRAGMA quick_check');
      if (result !== 'ok') {
        throw new Error(`quick_check: ${String(result)}`);
      }
      db.selectValue('SELECT 1 FROM __migrations__ LIMIT 1');
    } finally {
      db.close();
    }
  }

  function discardImport(pool: Pool, fileName: string) {
    try {
      pool.util.unlink(fileName);
    } catch {
      // Nothing to clean up
    }
  }

  async function migrateLegacy(
    pool: Pool,
    path: string,
    fileName: string,
  ): Promise<boolean> {
    const name = legacyDatabaseName(path);
    const contents = await openLegacyDatabaseContents(path, name, percent =>
      onMigrationProgress?.('copy', percent),
    );
    if (contents == null) {
      return false;
    }
    onMigrationProgress?.('copy', 0);
    try {
      await pool.util.importDb(fileName, contents.read);
      onMigrationProgress?.('verify');
      verifyImported(pool, fileName);
    } catch (error) {
      discardImport(pool, fileName);
      contents.close();
      onMigrationProgress?.('failed');
      throw new StorageMigrationError(path, error);
    }
    contents.close();

    onMigrationProgress?.('cleanup');
    const row = await getSqliteFileRow(path);
    const deleted = await deleteLegacyDatabase(name);
    await putSqliteFileRow({
      filepath: path,
      contents: '',
      storage: 'opfs',
      rev: row?.rev,
      ...(deleted ? {} : { legacyCleanup: 'pending' as const }),
    });
    onMigrationProgress?.('done');
    return true;
  }

  // A session without sync access handles (or an older build) may have
  // kept the database in the IndexedDB fallback's row; bring it into the
  // pool so the data follows the user to the faster store
  async function promoteFallbackRow(
    pool: Pool,
    path: string,
    fileName: string,
  ): Promise<boolean> {
    const row = await getSqliteFileRow(path);
    if (
      row?.storage !== 'memory-idb' ||
      !ArrayBuffer.isView(row.contents) ||
      row.contents.byteLength === 0
    ) {
      return false;
    }
    const bytes = row.contents;
    try {
      await pool.util.importDb(
        fileName,
        new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      );
      verifyImported(pool, fileName);
    } catch (error) {
      discardImport(pool, fileName);
      throw new StorageMigrationError(path, error);
    }
    await putSqliteFileRow({
      filepath: path,
      contents: '',
      storage: 'opfs',
      rev: row.rev,
    });
    return true;
  }

  // Whatever already holds this database: absurd-sql's layout, or the
  // fallback store's row
  async function importExisting(
    pool: Pool,
    path: string,
    fileName: string,
  ): Promise<boolean> {
    if (await migrateLegacy(pool, path, fileName)) {
      return true;
    }
    return promoteFallbackRow(pool, path, fileName);
  }

  const store: SqliteFileStore = {
    kind: 'opfs',

    async open(path, { create = true }: OpenOptions = {}) {
      const { dirId, fileName } = splitSqlitePath(path);
      const pool = await acquire(dirId, path);
      const already = pool.open.get(fileName);
      if (already) {
        return already;
      }
      try {
        let present = pool.util.getFileNames().includes(fileName);
        if (!present) {
          present = await importExisting(pool, path, fileName);
        }
        if (!present && !create) {
          throw new Error(`database does not exist: ${path}`);
        }
        if (!present) {
          logger.warn('sqlite storage: creating missing database', path);
        }
        const db = new (sqlite3().oo1.DB)({
          filename: fileName,
          flags: create ? 'c' : 'w',
          vfs: pool.util.vfsName,
        });
        applyFilePragmas(db);
        pool.open.set(fileName, db);
        if (!present) {
          await putSqliteFileRow({
            filepath: path,
            contents: '',
            storage: 'opfs',
          });
        }
        return db;
      } catch (error) {
        release(pool);
        throw error;
      }
    },

    close(path, db) {
      const { dirId, fileName } = splitSqlitePath(path);
      const pool = pools.get(dirId);
      db.close();
      if (pool && pool.open.get(fileName) === db) {
        pool.open.delete(fileName);
        release(pool);
      }
    },

    isOpen(path) {
      const { dirId, fileName } = splitSqlitePath(path);
      return pools.get(dirId)?.open.has(fileName) ?? false;
    },

    async readFile(path) {
      const { dirId, fileName } = splitSqlitePath(path);
      const open = pools.get(dirId)?.open.get(fileName);
      if (open) {
        return exportBytes(open);
      }
      const pool = await acquire(dirId, path);
      try {
        if (!pool.util.getFileNames().includes(fileName)) {
          const migrated = await importExisting(pool, path, fileName);
          if (!migrated) {
            throw new Error('File does not exist: ' + path);
          }
        }
        return pool.util.exportFile(fileName);
      } finally {
        release(pool);
      }
    },

    async writeFile(path, bytes) {
      const { dirId, fileName } = splitSqlitePath(path);
      if (pools.get(dirId)?.open.has(fileName)) {
        throw new Error(`cannot overwrite an open database: ${path}`);
      }
      const pool = await acquire(dirId, path);
      try {
        await pool.util.importDb(fileName, bytes);
        const row = await getSqliteFileRow(path);
        await putSqliteFileRow({
          filepath: path,
          contents: '',
          storage: 'opfs',
          rev: row?.rev,
        });
      } finally {
        release(pool);
      }
    },

    async removeFile(path) {
      const { dirId, fileName } = splitSqlitePath(path);
      const pool = await acquire(dirId, path);
      try {
        const open = pool.open.get(fileName);
        if (open) {
          open.close();
          pool.open.delete(fileName);
        }
        for (const name of [fileName, `${fileName}-journal`]) {
          if (pool.util.getFileNames().includes(name)) {
            pool.util.unlink(name);
          }
        }
        if (pool.util.getFileCount() === 0) {
          await pool.util.wipeFiles();
        }
      } finally {
        release(pool);
      }
      await deleteSqliteFileRow(path);
      await deleteLegacyDatabase(legacyDatabaseName(path));
    },

    async exists(path) {
      return (await getSqliteFileRow(path)) != null;
    },

    async flush() {
      // Writes go straight to the access handles and are flushed by sqlite
    },

    async releaseAll() {
      for (const pool of pools.values()) {
        for (const [fileName, db] of pool.open) {
          db.close();
          pool.open.delete(fileName);
        }
        release(pool);
      }
    },
  };

  return store;
}
