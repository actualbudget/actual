import * as sqlite from '#platform/server/sqlite';
import { createApp } from '#server/app';

export type StorageHandlers = {
  'storage-flush': typeof flushStorage;
  'storage-release': typeof releaseStorage;
  'storage-resume': typeof resumeStorage;
  'storage-info': typeof getStorageInfo;
};

export const app = createApp<StorageHandlers>();
app.method('storage-flush', flushStorage);
app.method('storage-release', releaseStorage);
app.method('storage-resume', resumeStorage);
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
// this worker, and a page that is leaving asks for it so that a frozen copy
// of the page holds nothing back; only the storage matters, the app state
// dies or relaunches with the page. A failed flush still lets go: the next
// worker must not wait on this one. No budget is opened from here on, so one
// that was still loading cannot take itself back.
async function releaseStorage() {
  try {
    await sqlite.flushSqliteStorage();
  } finally {
    await sqlite.releaseSqliteStorage();
  }
  return 'ok' as const;
}

// For a page that came back out of the back/forward cache with this worker,
// which may open budgets again
async function resumeStorage() {
  sqlite.resumeSqliteStorage();
  return 'ok' as const;
}

// Which storage this worker ended up using
async function getStorageInfo() {
  return { backend: sqlite.getStorageBackend() };
}
