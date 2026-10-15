import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

import InlineWorker from './browser-worker?worker&inline';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;
let ownsSession = false;

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
