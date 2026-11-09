import * as connection from '#platform/server/connection';

import { writeLegacyDatabaseBytes } from './absurd-migration';
import { detectOpfsSyncAccess } from './config';
import { getSqliteFileRow, listSqliteFileRows } from './files-store';
import { createMemoryIdbStore, isByteContents } from './idb-memory';
import { createOpfsStore } from './opfs-sahpool';
import { legacyDatabaseName } from './paths';
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
// Budgets open in another tab hold the storage lock and make this throw.
// The legacy copy is written before the store's file goes, and the store
// turns the row into the legacy marker in the same step as it drops the
// file, so an interruption at any point leaves the budget whole in one
// place or the other; a copy left behind by a failure is ignored while the
// row still names the store, and replaced by the next revert.
export async function revertToLegacy(): Promise<void> {
  const current = getSqliteStore();
  for (const row of await listSqliteFileRows()) {
    const path = row.filepath;
    if (current.isOpen(path)) {
      throw new Error(`cannot revert an open database: ${path}`);
    }
    const bytes = await readStoredBytes(current, path);
    if (bytes == null) {
      // Recorded but never saved: nothing to copy, the row just goes
      await current.removeFile(path);
      continue;
    }
    await writeLegacyDatabaseBytes(legacyDatabaseName(path), bytes);
    await current.removeFile(path, { keepLegacyCopy: true });
  }
}

// The bytes of a path, or null for a fallback row that never got any: the
// fallback marks a new database before its first save, and a crash in
// between leaves the mark. The store is asked first, as it still answers for
// bytes it holds in memory after a failed save, which the row cannot show;
// any other failure, such as an OPFS file missing from its pool, stands.
async function readStoredBytes(
  current: SqliteFileStore,
  path: string,
): Promise<Uint8Array | null> {
  try {
    return await current.readFile(path);
  } catch (error) {
    const row = await getSqliteFileRow(path);
    if (row?.storage === 'memory-idb' && !isByteContents(row.contents)) {
      return null;
    }
    throw error;
  }
}
