import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

import InlineWorker from './browser-worker?worker&inline';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;
let ownsSession = false;
let unlistenPageLifecycle: (() => void) | null = null;

export async function init(
  config: InitConfig = {},
): Promise<{ send: typeof send }> {
  worker = new InlineWorker();

  try {
    await startBackendWorker(worker, config);
    ownsSession = Boolean(config.serverURL && config.password);
  } catch (error) {
    worker.terminate();
    worker = null;
    throw error;
  }

  unlistenPageLifecycle?.();
  unlistenPageLifecycle = listenForPageLifecycle();
  return { send };
}

// Where sync access handles are missing, the engine keeps the budget in
// memory and saves it to IndexedDB a moment after each change. A page that
// is hidden asks for that save at once, as the web client does, so a reload
// right after a change does not lose it even without `shutdown()`.
//
// A page that is leaving gives the budget up altogether, saving first:
// WebKit keeps the locks and file handles of a worker whose page went into
// the back/forward cache, where they would keep the next page from opening
// the same budget until the cached page is evicted. A page that comes back
// out of that cache opens its budget again.
//
// Best effort: a page that unloads at once may not give the worker the time
// to finish.
function listenForPageLifecycle(): (() => void) | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void send('storage-flush').catch(() => undefined);
    }
  };
  const onPageHide = () => {
    void send('storage-release').catch(() => undefined);
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      void reopenBudget().catch(() => undefined);
    }
  };
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

// The worker let go of its storage when the page left, so the budget it
// still counts as open is closed and opened afresh
async function reopenBudget() {
  const loaded = await send('load-prefs');
  if (loaded?.id) {
    await send('close-budget');
    await send('load-budget', { id: loaded.id });
  }
}

export async function shutdown() {
  unlistenPageLifecycle?.();
  unlistenPageLifecycle = null;
  if (worker) {
    try {
      await send('sync');
    } catch {
      // most likely that no budget is loaded, so the sync failed
    }
    try {
      await send('close-budget');
    } finally {
      try {
        if (ownsSession) {
          await send('subscribe-sign-out');
        }
      } finally {
        ownsSession = false;
        worker.terminate();
        worker = null;
      }
    }
  }
}
