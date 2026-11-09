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
// is hidden or leaving asks for that save at once, as the web client does,
// so a reload right after a change does not lose it even without
// `shutdown()`. Best effort: a page that unloads at once may not give the
// worker the time to finish.
function listenForPageLifecycle(): (() => void) | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const flush = () => {
    void send('storage-flush').catch(() => undefined);
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
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
