import * as connection from '#platform/server/connection';
import type { StorageBackend } from '#platform/server/sqlite/types';

import { writeLegacyDatabaseBytes } from './absurd-migration';
import { detectOpfsSyncAccess } from './config';
import { listSqliteFileRows, putSqliteFileRow } from './files-store';
import { createMemoryIdbStore } from './idb-memory';
import { createOpfsStore } from './opfs-sahpool';
import { legacyDatabaseName } from './paths';
import type {
  FileStoreKind,
  MigrationProgress,
  SqliteFileStore,
} from './types';

export { findMigratedStorageKind } from './files-store';
export type { FileStoreKind, SqliteFileStore } from './types';

let store: SqliteFileStore | null = null;

const reportMigration: MigrationProgress = (phase, percent) => {
  connection.send('storage-migration', { phase, percent });
};

// Picks and prepares the store for a non-legacy backend. `opfs` falls back
// to the in-memory store when sync access handles are unavailable.
export async function initSqliteStorage(
  requested: Exclude<StorageBackend, 'legacy'>,
): Promise<FileStoreKind> {
  const kind: FileStoreKind =
    requested === 'opfs' && (await detectOpfsSyncAccess())
      ? 'opfs'
      : 'memory-idb';
  store =
    kind === 'opfs'
      ? createOpfsStore({ onMigrationProgress: reportMigration })
      : createMemoryIdbStore({ onMigrationProgress: reportMigration });
  return kind;
}

export function getSqliteStore(): SqliteFileStore {
  if (store == null) {
    throw new Error('getSqliteStore: sqlite storage is not initialized');
  }
  return store;
}

export function hasSqliteStore(): boolean {
  return store != null;
}

// Test hook
export function setSqliteStore(next: SqliteFileStore | null) {
  store = next;
}

// Move every budget back to absurd-sql's layout and clear the markers, so
// the next start can pick the legacy engine (the opt-in phase's way back).
// Budgets open in another tab hold the storage lock and make this throw.
export async function revertToLegacy(): Promise<void> {
  const current = getSqliteStore();
  for (const row of await listSqliteFileRows()) {
    const path = row.filepath;
    if (current.isOpen(path)) {
      throw new Error(`cannot revert an open database: ${path}`);
    }
    const bytes = await current.readFile(path);
    // `removeFile` also drops any stale legacy copy, so it goes first; the
    // bytes stay in memory until the legacy copy is written
    await current.removeFile(path);
    try {
      await writeLegacyDatabaseBytes(legacyDatabaseName(path), bytes);
      // The legacy filesystem lists sqlite files from a marker row
      await putSqliteFileRow({ filepath: path, contents: '' });
    } catch (error) {
      await current.writeFile(path, bytes);
      throw error;
    }
  }
}
