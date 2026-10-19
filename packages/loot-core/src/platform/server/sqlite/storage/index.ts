import * as connection from '#platform/server/connection';
import type { StorageBackend } from '#platform/server/sqlite/types';

import { detectOpfsSyncAccess } from './config';
import { createMemoryIdbStore } from './idb-memory';
import { createOpfsStore } from './opfs-sahpool';
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
