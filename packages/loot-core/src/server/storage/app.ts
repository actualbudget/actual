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
  'storage-resume': typeof resumeStorage;
  'storage-info': typeof getStorageInfo;
  'storage-revert': typeof revertStorage;
};

export const app = createApp<StorageHandlers>();
app.method('storage-flush', flushStorage);
app.method('storage-release', releaseStorage);
app.method('storage-resume', resumeStorage);
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

// Move every budget back to absurd-sql's layout so the next start can use
// the legacy engine. Closes the open budget first; a budget open in another
// tab holds its storage lock and makes this fail.
async function revertStorage(): Promise<
  { ok: true } | { error: 'budget-in-use' | 'revert-failed' }
> {
  if (sqlite.getStorageBackend() === 'legacy') {
    return { ok: true };
  }
  // The budget this worker has open; `lastBudget` is whichever budget any
  // tab opened last, kept only so the relaunch starts where the user was
  const openBudgetId = prefs.getPrefs()?.id;
  const lastBudget = await asyncStorage.getItem('lastBudget');
  if (openBudgetId) {
    await runHandler(mainApp.handlers['close-budget'], undefined);
  }
  try {
    await sqlite.revertSqliteStorageToLegacy();
    return { ok: true };
  } catch (error) {
    // The client still shows the budget this closed, so reopen it; a
    // failure to is logged, and the revert's own error still answers
    if (openBudgetId) {
      try {
        const reopened = await runHandler(mainApp.handlers['load-budget'], {
          id: openBudgetId,
        });
        if (reopened.error) {
          logger.error(
            'storage: could not reopen the budget after a failed revert',
            reopened.error,
          );
        }
      } catch (reopenError) {
        logger.error(
          'storage: could not reopen the budget after a failed revert',
          reopenError,
        );
      }
    }
    if (error instanceof sqlite.BudgetInUseError) {
      return { error: 'budget-in-use' };
    }
    logger.error('storage: revert to the legacy layout failed', error);
    return { error: 'revert-failed' };
  } finally {
    if (lastBudget) {
      await asyncStorage.setItem('lastBudget', lastBudget);
    }
  }
}
