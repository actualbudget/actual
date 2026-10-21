import * as asyncStorage from '#platform/server/asyncStorage';
import { logger } from '#platform/server/log';
import * as sqlite from '#platform/server/sqlite';
import { createApp } from '#server/app';
import { app as mainApp } from '#server/main-app';
import { runHandler } from '#server/mutators';
import * as prefs from '#server/prefs';

export type StorageHandlers = {
  'storage-flush': typeof flushStorage;
  'storage-release': typeof releaseStorage;
  'storage-info': typeof getStorageInfo;
  'storage-revert': typeof revertStorage;
};

export const app = createApp<StorageHandlers>();
app.method('storage-flush', flushStorage);
app.method('storage-release', releaseStorage);
app.method('storage-info', getStorageInfo);
app.method('storage-revert', revertStorage);

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

// Move every budget back to absurd-sql's layout so the next start can use
// the legacy engine. Closes the open budget first; a budget open in another
// tab holds its storage lock and makes this fail.
async function revertStorage(): Promise<
  { ok: true } | { error: 'budget-in-use' | 'revert-failed' }
> {
  if (sqlite.getStorageBackend() === 'legacy') {
    return { ok: true };
  }
  // Closing forgets the last budget; keep it so the relaunch reopens it
  const lastBudget = await asyncStorage.getItem('lastBudget');
  if (prefs.getPrefs()) {
    await runHandler(mainApp.handlers['close-budget'], undefined);
  }
  try {
    await sqlite.revertSqliteStorageToLegacy();
  } catch (error) {
    if (error instanceof sqlite.BudgetInUseError) {
      return { error: 'budget-in-use' };
    }
    logger.error('storage: revert to the legacy layout failed', error);
    return { error: 'revert-failed' };
  }
  if (lastBudget) {
    await asyncStorage.setItem('lastBudget', lastBudget);
  }
  return { ok: true };
}
