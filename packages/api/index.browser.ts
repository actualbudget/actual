import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;

export async function init(
  config: InitConfig = {},
): Promise<{ send: typeof send }> {
  // Non-literal URL so bundlers don't pre-bundle ./worker.js, which only
  // exists next to the built file; it resolves at runtime instead.
  const rel = './worker.js';
  worker = new Worker(new URL(rel, import.meta.url), { type: 'module' });

  // String manipulation instead of `new URL('.', import.meta.url)` so
  // consumer asset analyzers leave it alone.
  const assetsBaseUrl = import.meta.url.replace(/[^/]+$/, '');
  await startBackendWorker(worker, config, assetsBaseUrl);

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
