import * as sqlite from '#platform/server/sqlite';
import { createApp } from '#server/app';
import { app as mainApp } from '#server/main-app';
import { runHandler } from '#server/mutators';
import * as prefs from '#server/prefs';

export type StorageHandlers = {
  'storage-flush': typeof flushStorage;
  'storage-release': typeof releaseStorage;
};

export const app = createApp<StorageHandlers>();
app.method('storage-flush', flushStorage);
app.method('storage-release', releaseStorage);

// Persist anything the storage layer is holding. The IndexedDB fallback
// writes lazily, so the client asks for this when the tab is hidden or
// about to unload.
async function flushStorage() {
  await sqlite.flushSqliteStorage();
  return 'ok' as const;
}

// Close the open budget and let go of storage handles and locks, so a
// worker in another tab can take the budget over. The tab bridge asks for
// this before terminating a worker.
async function releaseStorage() {
  if (prefs.getPrefs()) {
    await runHandler(mainApp.handlers['close-budget'], undefined);
  }
  await sqlite.releaseSqliteStorage();
  return 'ok' as const;
}
