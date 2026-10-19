import * as idb from '#platform/server/indexeddb';

import type { FileStoreKind } from './types';

// The IndexedDB `files` store keeps one row per persisted path. For a
// sqlite path the row is the marker the filesystem rebuilds its hierarchy
// from, records which store holds the bytes, and for the IndexedDB
// fallback holds the bytes themselves.
export type SqliteFileRow = {
  filepath: string;
  contents: string | Uint8Array;
  storage?: FileStoreKind;
  // Bumped on every write by the fallback store so a second tab's writes
  // can be detected
  rev?: number;
  // The absurd-sql database could not be deleted after migration yet
  legacyCleanup?: 'pending';
};

// Each helper opens its transaction right before the request so the
// transaction cannot go inactive in between

export async function getSqliteFileRow(
  path: string,
): Promise<SqliteFileRow | undefined> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  const row = await idb.get(store, path);
  return row as SqliteFileRow | undefined;
}

export async function putSqliteFileRow(row: SqliteFileRow): Promise<void> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  await idb.set(store, row);
}

export async function deleteSqliteFileRow(path: string): Promise<void> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  await idb.del(store, path);
}

// Any sqlite file already moved off absurd-sql. Used at startup: once data
// lives in the new storage the legacy engine must not be chosen, whatever
// the flag says.
export async function findMigratedStorageKind(): Promise<FileStoreKind | null> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  const rows = await new Promise<SqliteFileRow[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as SqliteFileRow[]);
    request.onerror = () => reject(request.error);
  });
  for (const row of rows) {
    if (row.storage === 'opfs' || row.storage === 'memory-idb') {
      return row.storage;
    }
  }
  return null;
}
