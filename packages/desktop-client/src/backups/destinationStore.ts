// Persists the backup destination chosen for each budget. Provider payloads
// (a directory handle today, tokens or account ids for cloud providers) are
// structured-cloneable but not JSON-serialisable, so they can only live in
// IndexedDB. This is a separate, client-owned database: the `actual`
// database belongs to the loot-core worker and has a fixed schema version.

import type { BackupDestinationKind } from './types';

const DATABASE_NAME = 'actual-client';
// Bump whenever the object stores change; `onupgradeneeded` only runs when
// the version is higher than the one already in the browser.
const DATABASE_VERSION = 2;
const STORE_NAME = 'backupDestinations';
const LEGACY_STORE_NAMES = ['backupFolders'];

export type BackupDestinationRecord = {
  kind: BackupDestinationKind;
  payload: unknown;
  chosenAt: string;
};

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        for (const legacyName of LEGACY_STORE_NAMES) {
          if (database.objectStoreNames.contains(legacyName)) {
            database.deleteObjectStore(legacyName);
          }
        }
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };
        resolve(database);
      };
      request.onerror = () => reject(request.error);
    });
    databasePromise.catch(() => {
      databasePromise = null;
    });
  }
  return databasePromise;
}

function awaitRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getBackupDestinationRecord(
  budgetId: string,
): Promise<BackupDestinationRecord | null> {
  const database = await openDatabase();
  const store = database
    .transaction(STORE_NAME, 'readonly')
    .objectStore(STORE_NAME);
  const record = await awaitRequest<BackupDestinationRecord | undefined>(
    store.get(budgetId),
  );
  return record ?? null;
}

export async function setBackupDestinationRecord(
  budgetId: string,
  record: BackupDestinationRecord,
): Promise<void> {
  const database = await openDatabase();
  const store = database
    .transaction(STORE_NAME, 'readwrite')
    .objectStore(STORE_NAME);
  await awaitRequest(store.put(record, budgetId));
}

export async function deleteBackupDestinationRecord(
  budgetId: string,
): Promise<void> {
  const database = await openDatabase();
  const store = database
    .transaction(STORE_NAME, 'readwrite')
    .objectStore(STORE_NAME);
  await awaitRequest(store.delete(budgetId));
}
