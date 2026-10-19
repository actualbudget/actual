import * as connection from '#platform/server/connection';

import { detectOpfsSyncAccess } from './config';
import { createMemoryIdbStore } from './idb-memory';
import { createOpfsStore } from './opfs-sahpool';
import type { FileStoreKind, MigrationPhase, SqliteFileStore } from './types';

export type { FileStoreKind, SqliteFileStore } from './types';

let store: SqliteFileStore | null = null;

function reportMigration(phase: MigrationPhase, percent?: number) {
  connection.send('storage-migration', { phase, percent });
}

// Picks and prepares the store. `opfs` falls back to the in-memory store
// when sync access handles are unavailable.
export async function initSqliteStorage(
  requested: FileStoreKind,
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

// Test hook
export function setSqliteStore(next: SqliteFileStore | null) {
  store = next;
}
