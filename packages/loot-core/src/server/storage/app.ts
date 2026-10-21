import * as sqlite from '#platform/server/sqlite';
import { createApp } from '#server/app';

export type StorageHandlers = {
  'storage-flush': typeof flushStorage;
  'storage-release': typeof releaseStorage;
  'storage-info': typeof getStorageInfo;
};

export const app = createApp<StorageHandlers>();
app.method('storage-flush', flushStorage);
app.method('storage-release', releaseStorage);
app.method('storage-info', getStorageInfo);

// Persist anything the storage layer is holding. The IndexedDB fallback
// writes lazily, so the client asks for this when the tab is hidden or
// about to unload.
async function flushStorage() {
  await sqlite.flushSqliteStorage();
  return 'ok' as const;
}

// Let go of storage handles and locks so a worker in another tab can take
// the budget over. The tab bridge asks for this right before terminating
// this worker, so only the storage matters; the app state dies with it.
async function releaseStorage() {
  await sqlite.flushSqliteStorage();
  await sqlite.releaseSqliteStorage();
  return 'ok' as const;
}

// Which storage this worker ended up using
async function getStorageInfo() {
  return { backend: sqlite.getStorageBackend() };
}
