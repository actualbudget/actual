import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

import InlineWorker from './browser-worker?worker&inline';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;
let lifecycleQueue = Promise.resolve();

function enqueueLifecycle<T>(operation: () => Promise<T>): Promise<T> {
  const result = lifecycleQueue.then(operation, operation);
  lifecycleQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function shutdownWorker() {
  const workerToShutdown = worker;
  if (workerToShutdown === null) {
    return;
  }

  try {
    await send('sync');
  } catch {
    // most likely that no budget is loaded, so the sync failed
  }
  try {
    await send('close-budget');
  } finally {
    workerToShutdown.terminate();
    if (worker === workerToShutdown) {
      worker = null;
    }
  }
}

export function init(config: InitConfig = {}): Promise<{ send: typeof send }> {
  return enqueueLifecycle(async () => {
    if (worker !== null) {
      await shutdownWorker();
    }

    const nextWorker = new InlineWorker();
    worker = nextWorker;

    try {
      await startBackendWorker(nextWorker, config);
    } catch (error) {
      nextWorker.terminate();
      if (worker === nextWorker) {
        worker = null;
      }
      throw error;
    }

    return { send };
  });
}

export function shutdown() {
  return enqueueLifecycle(shutdownWorker);
}
