import * as connection from '#platform/server/connection';

import { detectOpfsSyncAccess } from './config';
import { listSqliteFileRows } from './files-store';
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

// Move every budget back to absurd-sql's layout and clear the markers, so
// the next start can pick the legacy engine (the opt-in phase's way back).
// Each budget moves under one hold of its lock, so nothing can open it and
// write between the copy and the cutover; a budget open in another tab
// holds that lock and makes this throw. The legacy copy is written before
// the store's file goes, and the row turns into the legacy marker in the
// same step, so an interruption leaves the budget whole in one place or the
// other; a copy left behind by a failure is ignored while the row still
// names the store, and replaced by the next revert.
export async function revertToLegacy(): Promise<void> {
  const current = getSqliteStore();
  for (const row of await listSqliteFileRows()) {
    await current.revertFile(row.filepath);
  }
}
