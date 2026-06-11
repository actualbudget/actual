import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;

export async function init(
  config: InitConfig = {},
): Promise<{ send: typeof send }> {
  // Non-literal so bundlers don't pre-bundle ./worker.js, which only exists
  // next to the built file.
  const rel = './worker.js';
  worker = new Worker(new URL(rel, import.meta.url), { type: 'module' });

  // Not `new URL('.', import.meta.url)` — consumer asset analyzers rewrite it.
  const assetsBaseUrl = import.meta.url.replace(/[^/]+$/, '');
  try {
    await startBackendWorker(worker, config, assetsBaseUrl);
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
    await send('close-budget');
    worker.terminate();
    worker = null;
  }
}
