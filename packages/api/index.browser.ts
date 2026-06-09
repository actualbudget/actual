// Main-thread browser entry for @actual-app/api.
//
// Public surface matches the Node entry. The worker is spawned internally
// so consumers write:
//
//   import * as api from '@actual-app/api';
//   await api.init({ dataDir: '/documents', serverURL, password });
//   await api.getAccounts();
//
// All the worker plumbing lives in loot-core: the worker entry
// (server/api-browser-worker.ts), the main-thread client connection
// (platform/client/connection), and the worker-routing `lib`
// (server/main.api-browser.ts, selected via the `api-browser` export
// condition in this build). This file only wires those together and owns
// the api-package-specific bits: where the worker bundle and bundled assets
// live.
//
// worker.js must be a sibling of browser.js at runtime. Our build ships
// them together in dist/; the consumer's bundler resolves the worker URL
// via `new URL(..., import.meta.url)`.

import { createBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import type { BackendWorker } from '@actual-app/core/platform/client/backend-worker';
import * as connection from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

export * from './methods';
export * as utils from './utils';

// The connection layer keeps the worker internally; hold our own handle so
// shutdown() can terminate it (and the IDB helper worker absurd-sql spawned).
const state: { backend: BackendWorker | null } = { backend: null };

// connection.send is typed against the Handlers union; the api facade forwards
// arbitrary names (including the worker-local 'api-browser/init'), so use a
// loosened local alias.
const send = connection.send as (
  name: string,
  args?: unknown,
) => Promise<unknown>;

function createWorker(): Worker {
  // Vite's `vite:worker-import-meta-url` plugin rewrites this pattern at
  // the CONSUMER's build time (emit worker.js as an asset, substitute the
  // hashed URL). Feeding it a non-literal first argument keeps the api's
  // OWN lib build from trying to pre-bundle it, which would fail because
  // ./worker.js is not a source-tree sibling of this file.
  const rel = './worker.js';
  return new Worker(new URL(rel, import.meta.url), { type: 'module' });
}

export async function init(config: InitConfig = {}) {
  // createBackendWorker installs absurd-sql's main-thread bridge. loot-core's
  // client connection grabs the worker through `global.Actual.getServerSocket`
  // (the same seam the desktop app uses); we satisfy it with a minimal shim
  // rather than the full desktop `global.Actual`.
  state.backend = createBackendWorker(createWorker());
  const worker = state.backend.worker;
  (
    globalThis as unknown as { Actual: { getServerSocket: () => Worker } }
  ).Actual = { getServerSocket: () => worker };

  // Resolves once the worker posts `connect`; also drains the client's
  // message queue and completes the handshake.
  await connection.init();

  // Point loot-core's browser fs at our dist/ directory so its fetches land
  // on files we ship (data-file-index.txt, migrations/, default-db.sqlite,
  // sql-wasm.wasm). Derive the base URL via string manipulation rather than
  // `new URL('.', import.meta.url)` so consumer bundlers' asset analyzers
  // leave it alone.
  const assetsBaseUrl = import.meta.url.replace(/[^/]+$/, '');
  await send('api-browser/init', { ...config, __assetsBaseUrl: assetsBaseUrl });

  // Return a {send} handle compatible with the Node entry so existing
  // consumer code that does `const internal = await api.init(...);
  // internal.send(...)` keeps working on the browser build too.
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
  if (state.backend) {
    state.backend.terminate();
    state.backend = null;
  }
}
