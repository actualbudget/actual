// Main-thread browser entry for @actual-app/api. The backend runs in a Web
// Worker (absurd-sql requires one); this facade spawns it, connects loot-core's
// client connection to it, and routes methods.ts's sends over that connection.
// Public surface matches the Node entry.

import { connectBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send as connectionSend } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

import { _setSend } from './send';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;

// Loosened: the facade also sends the worker-local 'api-browser/init', which
// isn't part of the shared Handlers union.
const send = connectionSend as (
  name: string,
  args?: unknown,
) => Promise<unknown>;

// In the browser, methods.ts sends over the client connection to the Worker.
_setSend(connectionSend);

function createWorker(): Worker {
  // Non-literal URL arg so the api's own lib build doesn't pre-bundle
  // ./worker.js (not a source sibling); the consumer's bundler resolves it.
  const rel = './worker.js';
  return new Worker(new URL(rel, import.meta.url), { type: 'module' });
}

export async function init(config: InitConfig = {}) {
  worker = createWorker();
  await connectBackendWorker(worker);

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
