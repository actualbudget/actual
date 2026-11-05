import * as connection from '#platform/server/connection';
import type { Data } from '#platform/server/indexeddb';
import { logger } from '#platform/server/log';
import {
  exportBytes,
  getSqlite3,
  openMemoryDatabase,
} from '#platform/server/sqlite/wasm';
import type { WasmDatabase } from '#platform/server/sqlite/wasm';

import {
  completeMigration,
  deleteLegacyDatabase,
  readLegacyDatabaseBytes,
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
import { acquireWebLock, budgetLockName } from './locks';
import { legacyDatabaseName } from './paths';
import type { MigrationProgress, SqliteFileStore } from './types';

// The fallback for browsers without OPFS sync access handles. Each
// database runs in memory and its bytes are written back to the
// IndexedDB `files` row after writes, debounced, plus on close and on
// request. A Web Lock keeps a second worker out where locks exist; the
// row's revision counter is the backstop where they do not: a write by
// another tab is noticed on the next persist and reported, and this tab
// stops overwriting.

const DEFAULT_DEBOUNCE_MS = 1000;
const DEFAULT_MAX_DIRTY_MS = 5000;
const DEFAULT_LOCK_TIMEOUT_MS = 2000;

export type MemoryIdbStoreOptions = {
  onMigrationProgress?: MigrationProgress;
  debounceMs?: number;
  maxDirtyMs?: number;
  lockTimeoutMs?: number;
};

type Entry = {
  path: string;
  db: WasmDatabase;
  rev: number;
  dirty: boolean;
  conflicted: boolean;
  firstDirtyAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
  pending: Promise<void> | null;
  releaseLock: () => void;
};

// Rows read back from IndexedDB may be views from another realm, so do
// not rely on `instanceof`
export function isByteContents(contents: unknown): contents is Uint8Array {
  return ArrayBuffer.isView(contents) && contents.byteLength > 0;
}

export function createMemoryIdbStore({
  onMigrationProgress,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  maxDirtyMs = DEFAULT_MAX_DIRTY_MS,
  lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS,
}: MemoryIdbStoreOptions = {}): SqliteFileStore {
  const entries = new Map<string, Entry>();
  const byDb = new Map<WasmDatabase, Entry>();
  // Writes still in flight for closed databases, keyed by path
  const pendingWrites = new Map<string, Promise<void>>();
  // Snapshots whose write on close failed, kept so the next open of the
  // path continues from them instead of the stale row, and writes again
  const unsaved = new Map<string, { bytes: Uint8Array; rev: number }>();

  function inTransaction(db: WasmDatabase): boolean {
    const { capi } = getSqlite3();
    return db.pointer != null && capi.sqlite3_get_autocommit(db.pointer) === 0;
  }

  async function persist(entry: Entry, bytes: Uint8Array): Promise<void> {
    const current = await getSqliteFileRow(entry.path);
    if ((current?.rev ?? 0) !== entry.rev) {
      // Someone else wrote this file since we loaded it. Keep working in
      // memory but stop overwriting their data.
      entry.conflicted = true;
      logger.warn('sqlite storage: another tab wrote', entry.path);
      connection.send('fallback-write-error');
      return;
    }
    const rev = entry.rev + 1;
    await putSqliteFileRow({
      filepath: entry.path,
      contents: bytes,
      storage: 'memory-idb',
      rev,
    });
    entry.rev = rev;
  }

  function schedule(entry: Entry) {
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    const waited =
      entry.firstDirtyAt == null ? 0 : Date.now() - entry.firstDirtyAt;
    const delay = Math.max(0, Math.min(debounceMs, maxDirtyMs - waited));
    entry.timer = setTimeout(() => {
      entry.timer = null;
      void flushEntry(entry);
    }, delay);
  }

  function flushEntry(entry: Entry): Promise<void> {
    if (!entry.dirty || entry.conflicted) {
      return entry.pending ?? Promise.resolve();
    }
    if (inTransaction(entry.db)) {
      // Never snapshot half a transaction. The cap restarts too, so a long
      // transaction is polled once per debounce rather than continuously.
      entry.firstDirtyAt = Date.now();
      schedule(entry);
      return entry.pending ?? Promise.resolve();
    }
    const bytes = exportBytes(entry.db);
    entry.dirty = false;
    entry.firstDirtyAt = null;
    const previous = entry.pending ?? Promise.resolve();
    const pending = previous
      .then(() => persist(entry, bytes))
      .catch(error => {
        logger.error('sqlite storage: failed to persist', entry.path, error);
        entry.dirty = true;
      })
      .finally(() => {
        if (entry.pending === pending) {
          entry.pending = null;
        }
      });
    entry.pending = pending;
    return pending;
  }

  // The stored bytes of a path (null for a database that does not exist
  // yet) and the row revision to continue from
  async function loadBytes(
    path: string,
    row: Data | undefined,
  ): Promise<{ bytes: Uint8Array | null; rev: number }> {
    if (row?.storage === 'opfs') {
      // The bytes live in an OPFS pool this session cannot reach; never
      // shadow them with an empty database
      throw new StorageUnavailableError(
        `${path} is stored in OPFS, which is not available here`,
      );
    }
    const rev = row?.rev ?? 0;
    if (row && isByteContents(row.contents)) {
      return { bytes: row.contents, rev };
    }
    if (row?.storage) {
      // Marked as ours but empty: nothing to load
      return { bytes: null, rev };
    }
    // Either no row or the legacy filesystem's marker: look for absurd-sql
    // data
    const bytes = await readLegacyDatabaseBytes(path, percent =>
      onMigrationProgress?.('copy', percent),
    );
    if (bytes == null) {
      return { bytes: null, rev };
    }
    onMigrationProgress?.('verify');
    const check = openMemoryDatabase(bytes);
    try {
      verifyMigratedDatabase(check);
    } catch (error) {
      onMigrationProgress?.('failed');
      throw new StorageMigrationError(path, error);
    } finally {
      check.close();
    }
    await completeMigration(
      { filepath: path, contents: bytes, storage: 'memory-idb', rev: rev + 1 },
      onMigrationProgress,
    );
    return { bytes, rev: rev + 1 };
  }

  const store: SqliteFileStore = {
    kind: 'memory-idb',

    async open(path) {
      const existing = entries.get(path);
      if (existing) {
        return existing.db;
      }
      await pendingWrites.get(path);
      const releaseLock = await acquireWebLock(
        budgetLockName(path),
        lockTimeoutMs,
      ).catch(() => {
        throw new BudgetInUseError(path);
      });
      try {
        const stranded = unsaved.get(path);
        const { bytes, rev } =
          stranded ?? (await loadBytes(path, await getSqliteFileRow(path)));
        const db = openMemoryDatabase(bytes ?? undefined);
        const entry: Entry = {
          path,
          db,
          rev,
          dirty: false,
          conflicted: false,
          firstDirtyAt: null,
          timer: null,
          pending: null,
          releaseLock,
        };
        if (bytes == null) {
          // A brand new file: record it so the filesystem lists it
          await putSqliteFileRow({
            filepath: path,
            contents: new Uint8Array(0),
            storage: 'memory-idb',
            rev,
          });
        }
        if (bytes == null || stranded) {
          unsaved.delete(path);
          entry.dirty = true;
          entry.firstDirtyAt = Date.now();
          schedule(entry);
        }
        entries.set(path, entry);
        byDb.set(db, entry);
        return db;
      } catch (error) {
        releaseLock();
        throw error;
      }
    },

    close(path, db) {
      const entry = entries.get(path);
      if (!entry || entry.db !== db) {
        db.close();
        return;
      }
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      let bytes: Uint8Array | null = null;
      if (entry.dirty && !entry.conflicted) {
        bytes = exportBytes(db);
        entry.dirty = false;
      }
      db.close();
      entries.delete(path);
      byDb.delete(db);
      const previous = entry.pending ?? Promise.resolve();
      entry.pending = previous
        .then(() => (bytes ? persist(entry, bytes) : undefined))
        .catch(error => {
          logger.error(
            'sqlite storage: failed to persist on close',
            path,
            error,
          );
          if (bytes) {
            unsaved.set(path, { bytes, rev: entry.rev });
          }
        })
        .finally(() => entry.releaseLock());
      // Keep the write reachable for readFile/removeFile until it lands
      pendingWrites.set(path, entry.pending);
      void entry.pending.finally(() => {
        if (pendingWrites.get(path) === entry.pending) {
          pendingWrites.delete(path);
        }
      });
    },

    async readFile(path) {
      await pendingWrites.get(path);
      const entry = entries.get(path);
      if (entry) {
        return exportBytes(entry.db);
      }
      const { bytes } =
        unsaved.get(path) ??
        (await loadBytes(path, await getSqliteFileRow(path)));
      if (bytes == null) {
        throw new Error('File does not exist: ' + path);
      }
      return bytes;
    },

    async writeFile(path, bytes) {
      await pendingWrites.get(path);
      if (entries.has(path)) {
        throw new Error(`cannot overwrite an open database: ${path}`);
      }
      const row = await getSqliteFileRow(path);
      await putSqliteFileRow({
        filepath: path,
        contents: bytes,
        storage: 'memory-idb',
        rev: (row?.rev ?? 0) + 1,
      });
    },

    async removeFile(path) {
      await pendingWrites.get(path);
      const entry = entries.get(path);
      if (entry) {
        store.close(path, entry.db);
        await pendingWrites.get(path);
      }
      await deleteSqliteFileRow(path);
      await deleteLegacyDatabase(legacyDatabaseName(path));
    },

    async exists(path) {
      return (await getSqliteFileRow(path)) != null;
    },

    async flush() {
      await Promise.all([...entries.values()].map(flushEntry));
    },

    onWrite(db) {
      const entry = byDb.get(db);
      if (!entry) {
        return;
      }
      entry.dirty = true;
      entry.firstDirtyAt ??= Date.now();
      schedule(entry);
    },
  };

  return store;
}
