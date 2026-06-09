// Main-thread browser entry for @actual-app/api.
//
// Public surface matches the Node entry. The worker is spawned internally
// so consumers write:
//
//   import * as api from '@actual-app/api';
//   await api.init({ dataDir: '/documents', serverURL, password });
//   await api.getAccounts();
//
// worker.js must be a sibling of browser.js at runtime. Our build ships
// them together in dist/; the consumer's bundler resolves the worker URL
// via `new URL(..., import.meta.url)`.

import { _setBrowserSend } from './browser/lib-stub';
import type { InitConfig } from './browser/lib-stub';
import { rpc, setWorker, terminate } from './browser/rpc';

export * from './methods';
export * as utils from './utils';

// Wire methods.ts's `lib.send` through the worker.
_setBrowserSend((name, args) => rpc(name, args));

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
  setWorker(createWorker());
  // Point loot-core's browser fs at our dist/ directory. We want the
  // directory portion of this bundle's own URL so loot-core's fetches land
  // on files we ship (data-file-index.txt, migrations/, default-db.sqlite,
  // sql-wasm.wasm). Vite's asset plugin tries to pre-bundle
  // `new URL('.', import.meta.url)` at consumer build time and picks up
  // the `development` export condition (inlining index.ts as a data URL!).
  // Derive the base URL via string manipulation instead so static analyzers
  // leave it alone.
  const assetsBaseUrl = import.meta.url.replace(/[^/]+$/, '');
  await rpc('api-browser/init', { ...config, __assetsBaseUrl: assetsBaseUrl });
  // Return a {send} handle compatible with the Node entry so existing
  // consumer code that does `const internal = await api.init(...); internal.send(...)`
  // keeps working on the browser build too.
  return {
    send: (name: string, args?: unknown) => rpc(name, args),
  };
}

export async function shutdown() {
  try {
    await rpc('sync');
  } catch {
    // most likely no budget loaded
  }
  try {
    await rpc('close-budget');
  } catch {
    // ignore
  }
  terminate();
}
