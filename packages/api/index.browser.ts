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
  await rpc('api-browser/init', config);
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
