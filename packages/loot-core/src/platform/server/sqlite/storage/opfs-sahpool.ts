import type { SAHPoolUtil, Sqlite3Static } from '@sqlite.org/sqlite-wasm';

import type { Data } from '#platform/server/indexeddb';
import { logger } from '#platform/server/log';
import { exportBytes, getSqlite3 } from '#platform/server/sqlite/wasm';
import type { WasmDatabase } from '#platform/server/sqlite/wasm';

import {
  completeMigration,
  deleteLegacyDatabase,
  openLegacyDatabaseContents,
  verifyMigratedDatabase,
} from './absurd-migration';
import {
  BudgetInUseError,
  StorageMigrationError,
  StorageUnavailableError,
} from './errors';
import {
  deleteSqliteFileRow,
  getSqliteFileRow,
  putSqliteFileRow,
} from './files-store';
import {
  acquireWebLock,
  BUDGET_LOCK_TIMEOUT_MS,
  budgetLockName,
} from './locks';
import { legacyDatabaseName, splitSqlitePath } from './paths';
import type { MigrationProgress, SqliteFileStore } from './types';

// Primary web storage: SQLite's own `opfs-sahpool` VFS, one pool per
// budget directory so budgets can be open in different tabs at once. A
// pool holds the sqlite file plus its journal in pre-opened OPFS access
// handles, which are exclusive; a Web Lock per pool makes the conflict
// explicit instead of a failed install.

export const POOL_ROOT = 'actual/pools';
// A terminated worker releases its access handles asynchronously, so
// taking them right after a tab hand-over can fail; retry with backoff
const RETRY_DELAYS_MS = [0, 100, 250, 500, 1000, 2000, 3000];

// The package's types trail the runtime by one option
type PoolOptions = Parameters<Sqlite3Static['installOpfsSAHPoolVfs']>[0] & {
  forceReinitIfPreviouslyFailed?: boolean;
};

type Pool = {
  dirId: string;
  util: SAHPoolUtil;
  open: Map<string, WasmDatabase>;
  releaseLock: (() => void) | null;
  // Operations in progress, which keep the pool live as open databases do
  holders: number;
};

export type OpfsStoreDependencies = {
  sqlite3: () => Sqlite3Static;
  acquireLock: (name: string, timeoutMs: number) => Promise<() => void>;
  onMigrationProgress?: MigrationProgress;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

  // Installing a pool and unpausing one both take the access handles
  async function withHandleRetries<T>(attempt: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (const delay of RETRY_DELAYS_MS) {
      if (delay > 0) {
        await sleep(delay);
      }
      try {
        return await attempt();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  function installPool(dirId: string): Promise<SAHPoolUtil> {
    const options: PoolOptions = {
      name: `actual-${dirId}`,
      directory: `${POOL_ROOT}/${dirId}`,
      initialCapacity: 6,
      clearOnInit: false,
      // Keep the directory when an install fails, and retry for real
      // instead of replaying a failure the library cached earlier
      preserveOnInitFailure: true,
      forceReinitIfPreviouslyFailed: true,
    };
    return withHandleRetries(() => sqlite3().installOpfsSAHPoolVfs(options));
  }

  // Takes the lock and live handles of a pool. Concurrent callers share
  // one acquisition: the lock is exclusive, so a second request for it
  // would wait on the first and time out.
  const acquiring = new Map<string, Promise<Pool>>();

  function lockPool(dirId: string, path: string): Promise<Pool> {
    const existing = pools.get(dirId);
    if (existing?.releaseLock) {
      return Promise.resolve(existing);
    }
    const inFlight = acquiring.get(dirId);
    if (inFlight) {
      return inFlight;
    }
    const promise = takePool(dirId, path, existing).finally(() =>
      acquiring.delete(dirId),
    );
    acquiring.set(dirId, promise);
    return promise;
  }

  async function takePool(
    dirId: string,
    path: string,
    existing: Pool | undefined,
  ): Promise<Pool> {
    const releaseLock = await acquireLock(
      budgetLockName(path),
      BUDGET_LOCK_TIMEOUT_MS,
    ).catch(() => {
      throw new BudgetInUseError(path, 'the storage lock could not be taken');
    });
    try {
      if (existing) {
        if (existing.util.isPaused()) {
          await withHandleRetries(() => existing.util.unpauseVfs());
        }
        existing.releaseLock = releaseLock;
        return existing;
      }
      const util = await installPool(dirId);
      const pool: Pool = {
        dirId,
        util,
        open: new Map(),
        releaseLock,
        holders: 0,
      };
      pools.set(dirId, pool);
      return pool;
    } catch (error) {
      releaseLock();
      // Chrome raises NoModificationAllowedError from createSyncAccessHandle
      // while another worker still holds the handles
      if (
        error instanceof Error &&
        /lock|NoModificationAllowed/i.test(error.name + error.message)
      ) {
        throw new BudgetInUseError(
          path,
          'its access handles are still held by another worker',
        );
      }
      throw error;
    }
  }

  // A hold on the pool for the length of an operation, given back with
  // `release`, so that no operation can pause the handles another is using
  async function acquire(dirId: string, path: string): Promise<Pool> {
    let pool = await lockPool(dirId, path);
    // A close in the same tick can settle the pool before this continues,
    // so make sure the lock is still held
    while (!pool.releaseLock) {
      pool = await lockPool(dirId, path);
    }
    pool.holders += 1;
    return pool;
  }

  function release(pool: Pool) {
    pool.holders -= 1;
    settle(pool);
  }

  // Pauses the pool and gives up the lock once nothing uses it
  function settle(pool: Pool) {
    if (pool.holders > 0 || pool.open.size > 0 || !pool.releaseLock) {
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

  function verifyImported(pool: Pool, fileName: string) {
    const db = new (sqlite3().oo1.DB)({
      filename: fileName,
      flags: 'w',
      vfs: pool.util.vfsName,
    });
    try {
      verifyMigratedDatabase(db);
    } finally {
      db.close();
    }
  }

  // A journal left by a crash would be rolled back into whatever database
  // is opened under that name next, so it goes before the file is
  // replaced or removed
  function unlinkJournal(pool: Pool, fileName: string) {
    const journal = `${fileName}-journal`;
    if (pool.util.getFileNames().includes(journal)) {
      pool.util.unlink(journal);
    }
  }

  function discardImport(pool: Pool, fileName: string) {
    try {
      pool.util.unlink(fileName);
    } catch {
      // Nothing to clean up
    }
  }

  // Copies absurd-sql's data into the pool, if there is any
  async function migrateLegacy(
    pool: Pool,
    path: string,
    fileName: string,
    row: Data | undefined,
  ): Promise<boolean> {
    const contents = await openLegacyDatabaseContents(path, percent =>
      onMigrationProgress?.('copy', percent),
    );
    if (contents == null) {
      return false;
    }
    try {
      await pool.util.importDb(fileName, contents.read);
      onMigrationProgress?.('verify');
      verifyImported(pool, fileName);
      // A refused cutover or a failed marker write leaves nothing of the
      // move behind, so the next open redoes it
      await completeMigration(
        { filepath: path, contents: '', storage: 'opfs', rev: row?.rev },
        row?.rev ?? 0,
        contents.snapshot,
        onMigrationProgress,
      );
    } catch (error) {
      discardImport(pool, fileName);
      onMigrationProgress?.('failed');
      throw error instanceof BudgetInUseError
        ? error
        : new StorageMigrationError(path, error);
    }
    return true;
  }

  // Adopts a database the fallback store persisted whole into its row (the
  // browser gained sync access handles since), so it is never shadowed by
  // an empty one
  async function promoteFallbackRow(
    pool: Pool,
    path: string,
    fileName: string,
    row: Data | undefined,
  ): Promise<boolean> {
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
      await putSqliteFileRow({
        filepath: path,
        contents: '',
        storage: 'opfs',
        rev: row.rev,
      });
    } catch (error) {
      discardImport(pool, fileName);
      throw new StorageMigrationError(path, error);
    }
    await deleteLegacyDatabase(legacyDatabaseName(path));
    return true;
  }

  // Puts whatever already holds this database into the pool, and resolves
  // whether there is one. The row says who owns the bytes: the fallback's
  // row is what the app last used, so it wins over a pooled file an
  // interrupted promotion left and over an absurd-sql copy its own
  // migration could not delete; a row that says OPFS with no pooled file
  // means the pool lost it, which is never stood in for. With no row to
  // say, an absurd-sql copy wins over a pooled file: a crash between an
  // import and its marker leaves such a file, and the copy is what the
  // legacy engine kept editing since.
  async function importExisting(
    pool: Pool,
    path: string,
    fileName: string,
  ): Promise<boolean> {
    const row = await getSqliteFileRow(path);
    const pooled = pool.util.getFileNames().includes(fileName);
    if (row?.storage === 'opfs') {
      if (!pooled) {
        throw new StorageUnavailableError(
          `${path} is missing from its OPFS pool`,
        );
      }
      return true;
    }
    if (await promoteFallbackRow(pool, path, fileName, row)) {
      return true;
    }
    return (await migrateLegacy(pool, path, fileName, row)) || pooled;
  }

  // A write replacing a file is kept apart from opens and reads of that
  // path: a connection must never be created on a file mid-import
  const replacing = new Map<string, Promise<void>>();

  async function replaceFile(path: string, bytes: Uint8Array): Promise<void> {
    const { dirId, fileName } = splitSqlitePath(path);
    await opening.get(path)?.catch(() => undefined);
    const pool = await acquire(dirId, path);
    try {
      // Under the pool, where no open can land in between
      if (pool.open.has(fileName)) {
        throw new Error(`cannot overwrite an open database: ${path}`);
      }
      unlinkJournal(pool, fileName);
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
  }

  // Concurrent opens of one file share the whole operation, so a budget is
  // migrated into the pool once rather than by each caller
  const opening = new Map<string, Promise<WasmDatabase>>();

  function open(path: string): Promise<WasmDatabase> {
    const inFlight = opening.get(path);
    if (inFlight) {
      return inFlight;
    }
    const promise = openOnce(path).finally(() => {
      if (opening.get(path) === promise) {
        opening.delete(path);
      }
    });
    opening.set(path, promise);
    return promise;
  }

  async function openOnce(path: string): Promise<WasmDatabase> {
    const { dirId, fileName } = splitSqlitePath(path);
    await replacing.get(path)?.catch(() => undefined);
    const pool = await acquire(dirId, path);
    let db: WasmDatabase | undefined;
    try {
      const already = pool.open.get(fileName);
      if (already) {
        return already;
      }
      const present = await importExisting(pool, path, fileName);
      // Another call may have opened the file while that ran
      const opened = pool.open.get(fileName);
      if (opened) {
        return opened;
      }
      if (!present) {
        logger.warn('sqlite storage: creating missing database', path);
      }
      db = new (sqlite3().oo1.DB)({
        filename: fileName,
        flags: 'c',
        vfs: pool.util.vfsName,
      });
      applyFilePragmas(db);
      pool.open.set(fileName, db);
      // The marker can be missing although the file is in the pool, when
      // an earlier open failed after creating it, so check rather than
      // trust `present`
      const row = await getSqliteFileRow(path);
      if (row?.storage !== 'opfs') {
        await putSqliteFileRow({
          filepath: path,
          contents: '',
          storage: 'opfs',
          rev: row?.rev,
        });
      }
      return db;
    } catch (error) {
      if (db) {
        db.close();
        pool.open.delete(fileName);
      }
      throw error;
    } finally {
      release(pool);
    }
  }

  const store: SqliteFileStore = {
    kind: 'opfs',

    open,

    close(path, db) {
      const { dirId, fileName } = splitSqlitePath(path);
      const pool = pools.get(dirId);
      db.close();
      if (pool && pool.open.get(fileName) === db) {
        pool.open.delete(fileName);
        settle(pool);
      }
    },

    async readFile(path) {
      const { dirId, fileName } = splitSqlitePath(path);
      // A database being opened is read from its handle once it is, like
      // an open one, rather than imported a second time
      const inFlight = opening.get(path);
      if (inFlight) {
        return exportBytes(await inFlight);
      }
      const open = pools.get(dirId)?.open.get(fileName);
      if (open) {
        return exportBytes(open);
      }
      await replacing.get(path)?.catch(() => undefined);
      const pool = await acquire(dirId, path);
      try {
        if (!(await importExisting(pool, path, fileName))) {
          throw new Error('File does not exist: ' + path);
        }
        // A journal left by a crash is rolled back by a connection's first
        // read, so the raw file is consistent by the time it is exported
        const db = new (sqlite3().oo1.DB)({
          filename: fileName,
          flags: 'w',
          vfs: pool.util.vfsName,
        });
        try {
          db.selectValue('PRAGMA schema_version');
        } finally {
          db.close();
        }
        return pool.util.exportFile(fileName);
      } finally {
        release(pool);
      }
    },

    writeFile(path, bytes) {
      const promise = replaceFile(path, bytes).finally(() => {
        if (replacing.get(path) === promise) {
          replacing.delete(path);
        }
      });
      replacing.set(path, promise);
      return promise;
    },

    removeFile(path, options) {
      return store.removeFiles([path], options);
    },

    // All or nothing: every pool involved is taken before the first file
    // goes, so a budget open elsewhere leaves them all as they were
    async removeFiles(paths, options) {
      for (const path of paths) {
        // An open in flight ends with the database registered, so it is
        // closed here rather than unlinked under it; a write in flight
        // ends first too
        await opening.get(path)?.catch(() => undefined);
        await replacing.get(path)?.catch(() => undefined);
      }
      const held = new Map<string, Pool>();
      try {
        const files: { pool: Pool; fileName: string }[] = [];
        for (const path of paths) {
          const { dirId, fileName } = splitSqlitePath(path);
          let pool = held.get(dirId);
          if (!pool) {
            pool = await acquire(dirId, path);
            held.set(dirId, pool);
          }
          files.push({ pool, fileName });
        }
        // The rows go first, while the budgets are held: a waiting worker
        // could otherwise write a replacement whose marker this would
        // delete, and a worker killed from here on leaves at worst a file
        // nothing names, never a marker for a file that is gone. A file
        // moving to its absurd-sql copy leaves the legacy filesystem's
        // marker instead.
        for (const path of paths) {
          if (options?.keepLegacyCopy) {
            await putSqliteFileRow({ filepath: path, contents: '' });
          } else {
            await deleteSqliteFileRow(path);
          }
        }
        for (const { pool, fileName } of files) {
          const open = pool.open.get(fileName);
          if (open) {
            open.close();
            pool.open.delete(fileName);
          }
          unlinkJournal(pool, fileName);
          if (pool.util.getFileNames().includes(fileName)) {
            pool.util.unlink(fileName);
          }
        }
        for (const pool of held.values()) {
          if (pool.util.getFileCount() === 0) {
            // `unlink` only frees the slot; the bytes stay in the OPFS file
            // until the pool truncates its spare slots
            await pool.util.wipeFiles();
          }
        }
      } finally {
        for (const pool of held.values()) {
          release(pool);
        }
      }
      if (options?.keepLegacyCopy) {
        return;
      }
      // The absurd-sql copy is nobody's by now, and deleting it can wait
      // on another connection, so not under the locks
      for (const path of paths) {
        await deleteLegacyDatabase(legacyDatabaseName(path));
      }
    },

    async exists(path) {
      return (await getSqliteFileRow(path)) != null;
    },

    isOpen(path) {
      const { dirId, fileName } = splitSqlitePath(path);
      return pools.get(dirId)?.open.has(fileName) ?? false;
    },

    async flush() {
      // Writes go straight to the access handles and are flushed by sqlite
    },

    async releaseAll() {
      for (const pool of pools.values()) {
        for (const db of pool.open.values()) {
          db.close();
        }
        pool.open.clear();
        // Nothing of ours is held here: settle rather than give a hold back
        settle(pool);
      }
    },
  };

  return store;
}
