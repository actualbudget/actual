import * as connection from '#platform/server/connection';
import { logger } from '#platform/server/log';
import {
  exportBytes,
  getSqlite3,
  openMemoryDatabase,
} from '#platform/server/sqlite/wasm';
import type { WasmDatabase } from '#platform/server/sqlite/wasm';

import {
  deleteLegacyDatabase,
  readLegacyDatabaseBytes,
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
import type { SqliteFileRow } from './files-store';
import { acquireWebLock } from './locks';
import { legacyDatabaseName } from './paths';
import type { MigrationProgress, OpenOptions, SqliteFileStore } from './types';

// The fallback for browsers without OPFS sync access handles. Each
// database runs in memory and its bytes are written back to the
// IndexedDB `files` row after writes, debounced, plus on close and on
// request. Single tab only: a second tab's writes are detected by a
// revision counter and reported, after which this tab stops persisting.

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
function isByteContents(contents: unknown): contents is Uint8Array {
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
    const row: SqliteFileRow = {
      filepath: entry.path,
      contents: bytes,
      storage: 'memory-idb',
      rev: entry.rev + 1,
    };
    await putSqliteFileRow(row);
    entry.rev = row.rev as number;
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
      // Never snapshot half a transaction; try again shortly
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

  async function settle(path: string) {
    const entry = entries.get(path);
    if (entry?.pending) {
      await entry.pending;
    }
  }

  async function loadBytes(
    path: string,
    row: SqliteFileRow | undefined,
  ): Promise<Uint8Array | null> {
    if (row && isByteContents(row.contents)) {
      return row.contents;
    }
    if (row && row.storage != null) {
      // Marked as ours but empty: nothing to load
      return null;
    }
    // Either no row or the legacy marker: look for absurd-sql data
    const name = legacyDatabaseName(path);
    onMigrationProgress?.('copy', 0);
    const bytes = await readLegacyDatabaseBytes(path, name, percent =>
      onMigrationProgress?.('copy', percent),
    );
    if (bytes == null) {
      return null;
    }
    onMigrationProgress?.('verify');
    const check = openMemoryDatabase(bytes);
    try {
      const result = check.selectValue('PRAGMA quick_check');
      if (result !== 'ok') {
        throw new Error(`quick_check: ${String(result)}`);
      }
    } catch (error) {
      throw new StorageMigrationError(path, error);
    } finally {
      check.close();
    }
    await putSqliteFileRow({
      filepath: path,
      contents: bytes,
      storage: 'memory-idb',
      rev: (row?.rev ?? 0) + 1,
    });
    onMigrationProgress?.('cleanup');
    const deleted = await deleteLegacyDatabase(name);
    if (!deleted) {
      const saved = await getSqliteFileRow(path);
      if (saved) {
        await putSqliteFileRow({ ...saved, legacyCleanup: 'pending' });
      }
    }
    onMigrationProgress?.('done');
    return bytes;
  }

  const store: SqliteFileStore = {
    kind: 'memory-idb',

    async open(path, { create = true }: OpenOptions = {}) {
      const existing = entries.get(path);
      if (existing) {
        return existing.db;
      }
      await settle(path);
      await pendingWrites.get(path);
      const releaseLock = await acquireWebLock(
        'actual-budget:' + path,
        lockTimeoutMs,
      ).catch(() => {
        throw new BudgetInUseError(path);
      });
      try {
        const row = await getSqliteFileRow(path);
        if (row?.storage === 'opfs') {
          // The bytes live in an OPFS pool this session cannot reach;
          // never shadow them with an empty database
          throw new StorageUnavailableError(
            `${path} is stored in OPFS, which is not available here`,
          );
        }
        const bytes = await loadBytes(path, row);
        if (bytes == null && !create) {
          throw new Error(`database does not exist: ${path}`);
        }
        const db = openMemoryDatabase(bytes ?? undefined);
        const latest = bytes == null ? row : await getSqliteFileRow(path);
        const entry: Entry = {
          path,
          db,
          rev: latest?.rev ?? 0,
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
            rev: entry.rev,
          });
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
        .catch(error =>
          logger.error(
            'sqlite storage: failed to persist on close',
            path,
            error,
          ),
        )
        .finally(() => entry.releaseLock());
      // Keep the write reachable for readFile/removeFile until it lands
      pendingWrites.set(path, entry.pending);
      void entry.pending.finally(() => {
        if (pendingWrites.get(path) === entry.pending) {
          pendingWrites.delete(path);
        }
      });
    },

    isOpen(path) {
      return entries.has(path);
    },

    async readFile(path) {
      await pendingWrites.get(path);
      const entry = entries.get(path);
      if (entry) {
        return exportBytes(entry.db);
      }
      const row = await getSqliteFileRow(path);
      const bytes = await loadBytes(path, row);
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

    async flush(path) {
      const targets = path ? [entries.get(path)] : [...entries.values()];
      await Promise.all(
        targets.map(entry => (entry ? flushEntry(entry) : undefined)),
      );
    },

    async releaseAll() {
      for (const entry of [...entries.values()]) {
        store.close(entry.path, entry.db);
      }
      await Promise.all([...pendingWrites.values()]);
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
