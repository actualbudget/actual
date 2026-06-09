// Main-thread browser entry for @actual-app/api. The backend runs in a Web
// Worker; this facade spawns it and forwards calls over loot-core's client
// connection. Public surface matches the Node entry.

import { initBrowserBackend } from '@actual-app/core/platform/client/backend-worker';
import * as connection from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;

// connection.send is typed against the Handlers union; the facade also forwards
// the worker-local 'api-browser/init', so loosen the type.
const send = connection.send as (
  name: string,
  args?: unknown,
) => Promise<unknown>;

function createWorker(): Worker {
  // Non-literal URL arg so the api's own lib build doesn't pre-bundle
  // ./worker.js (not a source sibling); the consumer's bundler resolves it.
  const rel = './worker.js';
  return new Worker(new URL(rel, import.meta.url), { type: 'module' });
}

export async function init(config: InitConfig = {}) {
  worker = createWorker();
  initBrowserBackend(worker);
  // loot-core's client connection reads the worker from global.Actual; supply a
  // minimal shim rather than the full desktop global.
  const socket = worker;
  (
    globalThis as unknown as { Actual: { getServerSocket: () => Worker } }
  ).Actual = { getServerSocket: () => socket };

  await connection.init();

  // Point loot-core's browser fs at our dist/ dir. String manipulation, not
  // `new URL('.', import.meta.url)`, so consumer asset analyzers leave it alone.
  const assetsBaseUrl = import.meta.url.replace(/[^/]+$/, '');
  await send('api-browser/init', { ...config, __assetsBaseUrl: assetsBaseUrl });

  // {send} handle for parity with the Node entry's init() return.
  return { send };
}

export async function shutdown() {
  try {
    await send('sync');
  } catch {
    // most likely no budget loaded
  }
  try {
    await send('close-budget');
  } catch {
    // ignore
  }
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
