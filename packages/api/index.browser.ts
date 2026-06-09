// Browser entry for @actual-app/api: the backend runs in a Web Worker
// (absurd-sql requires one); loot-core owns the worker plumbing. Public
// surface matches the Node entry.

import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;

export async function init(
  config: InitConfig = {},
): Promise<{ send: typeof send }> {
  // Non-literal URL arg so the api's own lib build doesn't pre-bundle
  // ./worker.js (not a source sibling); the consumer's bundler resolves it.
  const rel = './worker.js';
  worker = new Worker(new URL(rel, import.meta.url), { type: 'module' });

  // Assets (sql wasm, default db, migrations) ship next to this bundle; derive
  // the dir via string manipulation so consumer asset analyzers leave it alone.
  const assetsBaseUrl = import.meta.url.replace(/[^/]+$/, '');
  await startBackendWorker(worker, config, assetsBaseUrl);

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
