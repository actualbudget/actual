import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

// Vite inlines the worker (its wasm + filesystem data are embedded too) as a
// Blob URL. This is the point of the browser build: consumer bundlers never see
// a worker entry to re-bundle, and no asset files are fetched, so
// `import '@actual-app/api'` + `init()` works in any bundler with no config
// (only COOP/COEP headers are required, for SharedArrayBuffer).
import InlineWorker from './browser-worker?worker&inline';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;

export async function init(
  config: InitConfig = {},
): Promise<{ send: typeof send }> {
  worker = new InlineWorker();

  try {
    await startBackendWorker(worker, config);
  } catch (error) {
    worker.terminate();
    worker = null;
    throw error;
  }

  return { send };
}

export async function shutdown() {
  if (worker) {
    try {
      await send('sync');
    } catch {
      // most likely that no budget is loaded, so the sync failed
    }
    try {
      await send('close-budget');
    } finally {
      worker.terminate();
      worker = null;
    }
  }
}
