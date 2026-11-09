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
  legacySnapshot,
  readLegacyDatabaseBytes,
  verifyMigratedDatabase,
  writeLegacyDatabaseBytes,
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
  putSqliteFileRowIfRev,
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
  // Whether the current run of failed writes has had its retry
  retried: boolean;
  // Whether the last write failed, for `flush` to report
  failed: boolean;
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
    const rev = entry.rev + 1;
    const written = await putSqliteFileRowIfRev(
      { filepath: entry.path, contents: bytes, storage: 'memory-idb', rev },
      entry.rev,
    );
    if (!written) {
      // Someone else wrote this file since we loaded it. Keep working in
      // memory but stop overwriting their data.
      entry.conflicted = true;
      logger.warn('sqlite storage: another tab wrote', entry.path);
      connection.send('fallback-write-error');
      return;
    }
    entry.rev = rev;
    entry.retried = false;
    entry.failed = false;
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
        entry.failed = true;
        if (byDb.get(entry.db) !== entry) {
          // Closed meanwhile: the close's own write reports for it
          return;
        }
        // One retry after the usual delay, then wait for the next write: a
        // steady retry would only repeat a quota failure, alert and all
        if (!entry.retried) {
          entry.retried = true;
          entry.firstDirtyAt = Date.now();
          schedule(entry);
        } else {
          connection.send('storage-write-failed', { path: entry.path });
        }
      })
      .finally(() => {
        if (entry.pending === pending) {
          entry.pending = null;
        }
      });
    entry.pending = pending;
    return pending;
  }

  // The bytes of such a row live in an OPFS pool this session cannot
  // reach: never shadow them with an empty database, or take them over
  function assertNotInOpfs(path: string, row: Data | undefined) {
    if (row?.storage === 'opfs') {
      throw new StorageUnavailableError(
        `${path} is stored in OPFS, which is not available here`,
      );
    }
  }

  // The stored bytes of a path (null for a database that does not exist
  // yet) and the row revision to continue from
  async function loadBytes(
    path: string,
    row: Data | undefined,
  ): Promise<{ bytes: Uint8Array | null; rev: number }> {
    assertNotInOpfs(path, row);
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
      rev,
      legacySnapshot(bytes),
      onMigrationProgress,
    );
    return { bytes, rev: rev + 1 };
  }

  function lockBudget(path: string): Promise<() => void> {
    return acquireWebLock(budgetLockName(path), lockTimeoutMs).catch(() => {
      throw new BudgetInUseError(path, 'the storage lock could not be taken');
    });
  }

  // Concurrent opens of one path share the whole operation, so the lock
  // is taken and the row loaded once
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
    const existing = entries.get(path);
    if (existing) {
      return existing.db;
    }
    await pendingWrites.get(path);
    const releaseLock = await lockBudget(path);
    try {
      const row = await getSqliteFileRow(path);
      assertNotInOpfs(path, row);
      // A snapshot stranded by a failed close is only current while the
      // row is still at the revision it was taken from
      let stranded = unsaved.get(path);
      if (stranded && (row?.rev ?? 0) !== stranded.rev) {
        unsaved.delete(path);
        stranded = undefined;
      }
      const { bytes, rev } = stranded ?? (await loadBytes(path, row));
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
        retried: false,
        failed: false,
        releaseLock,
      };
      if (bytes == null) {
        // A brand new file: record it so the filesystem lists it, unless
        // another worker got there first
        const written = await putSqliteFileRowIfRev(
          {
            filepath: path,
            contents: new Uint8Array(0),
            storage: 'memory-idb',
            rev,
          },
          rev,
        );
        if (!written) {
          db.close();
          throw new BudgetInUseError(
            path,
            'another worker created it meanwhile',
          );
        }
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
  }

  const store: SqliteFileStore = {
    kind: 'memory-idb',

    open,

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
      // Closing discards an open transaction, as sqlite would; never
      // snapshot half of one
      if (inTransaction(db)) {
        db.exec('ROLLBACK');
      }
      // Snapshot while the database is open: changes not written yet, or a
      // write still in flight, which marks the entry dirty again should it
      // fail, so the chain below only writes the snapshot when it must
      const bytes =
        !entry.conflicted && (entry.dirty || entry.pending != null)
          ? exportBytes(db)
          : null;
      db.close();
      entries.delete(path);
      byDb.delete(db);
      const previous = entry.pending ?? Promise.resolve();
      entry.pending = previous
        .then(() =>
          bytes && entry.dirty && !entry.conflicted
            ? persist(entry, bytes)
            : undefined,
        )
        .catch(error => {
          logger.error(
            'sqlite storage: failed to persist on close',
            path,
            error,
          );
          if (bytes) {
            unsaved.set(path, { bytes, rev: entry.rev });
            connection.send('storage-write-failed', { path });
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
      // A database being opened is read from it once it is, like an open
      // one, rather than loaded a second time
      const inFlight = opening.get(path);
      if (inFlight) {
        return exportBytes(await inFlight);
      }
      await pendingWrites.get(path);
      const entry = entries.get(path);
      if (entry) {
        return exportBytes(entry.db);
      }
      const stranded = unsaved.get(path);
      if (stranded) {
        return stranded.bytes;
      }
      // Loading may migrate the absurd-sql copy, so hold the budget lock
      // as an open does
      const releaseLock = await lockBudget(path);
      try {
        const { bytes } = await loadBytes(path, await getSqliteFileRow(path));
        if (bytes == null) {
          throw new Error('File does not exist: ' + path);
        }
        return bytes;
      } finally {
        releaseLock();
      }
    },

    async writeFile(path, bytes) {
      // An open in flight ends with the database open, which is then
      // refused below as usual
      await opening.get(path)?.catch(() => undefined);
      await pendingWrites.get(path);
      if (entries.has(path)) {
        throw new Error(`cannot overwrite an open database: ${path}`);
      }
      // The row is the file, so it changes only under the budget lock, as
      // the OPFS store's files do
      const releaseLock = await lockBudget(path);
      try {
        const row = await getSqliteFileRow(path);
        assertNotInOpfs(path, row);
        await putSqliteFileRow({
          filepath: path,
          contents: bytes,
          storage: 'memory-idb',
          rev: (row?.rev ?? 0) + 1,
        });
        unsaved.delete(path);
      } finally {
        releaseLock();
      }
    },

    removeFile(path) {
      return store.removeFiles([path]);
    },

    // All or nothing: every budget involved is locked and checked before
    // the first row goes, so a refusal leaves them all as they were
    async removeFiles(paths) {
      for (const path of paths) {
        // An open in flight ends with the database open, so it is closed
        // here rather than removed under it
        await opening.get(path)?.catch(() => undefined);
        await pendingWrites.get(path);
        const entry = entries.get(path);
        if (entry) {
          store.close(path, entry.db);
          await pendingWrites.get(path);
        }
      }
      const releases: (() => void)[] = [];
      try {
        const locked = new Set<string>();
        for (const path of paths) {
          const name = budgetLockName(path);
          if (!locked.has(name)) {
            locked.add(name);
            releases.push(await lockBudget(path));
          }
        }
        for (const path of paths) {
          assertNotInOpfs(path, await getSqliteFileRow(path));
        }
        for (const path of paths) {
          await deleteSqliteFileRow(path);
          unsaved.delete(path);
        }
      } finally {
        for (const release of releases) {
          release();
        }
      }
      for (const path of paths) {
        await deleteLegacyDatabase(legacyDatabaseName(path));
      }
    },

    // Bytes a failed save left in memory count as the file's, as in a read
    async revertFile(path) {
      await opening.get(path)?.catch(() => undefined);
      await pendingWrites.get(path);
      if (entries.has(path)) {
        throw new Error(`cannot revert an open database: ${path}`);
      }
      const releaseLock = await lockBudget(path);
      try {
        const row = await getSqliteFileRow(path);
        assertNotInOpfs(path, row);
        const stranded = unsaved.get(path);
        const bytes =
          stranded?.bytes ??
          (row && isByteContents(row.contents) ? row.contents : null);
        if (bytes == null) {
          // Recorded but never saved: nothing to copy, the row just goes
          if (row) {
            await deleteSqliteFileRow(path);
          }
          return;
        }
        await writeLegacyDatabaseBytes(legacyDatabaseName(path), bytes);
        await putSqliteFileRow({ filepath: path, contents: '' });
        unsaved.delete(path);
      } finally {
        releaseLock();
      }
    },

    async exists(path) {
      return (await getSqliteFileRow(path)) != null;
    },

    isOpen(path) {
      return entries.has(path);
    },

    // Rejects when a file could not be written, so callers never take a
    // flush for durability it did not deliver
    async flush() {
      await Promise.all([
        ...[...entries.values()].map(flushEntry),
        ...pendingWrites.values(),
      ]);
      const notWritten = [...entries.values()]
        .filter(entry => entry.failed || entry.conflicted)
        .map(entry => entry.path)
        .concat([...unsaved.keys()]);
      if (notWritten.length > 0) {
        throw new Error(
          'sqlite storage: not written: ' + notWritten.join(', '),
        );
      }
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
