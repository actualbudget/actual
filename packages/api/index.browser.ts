// Main-thread browser entry for @actual-app/api.
//
// Shape matches the Node entry on purpose: the same named imports work. The
// one browser-specific requirement is that the consumer pass a Worker into
// init(), because absurd-sql's Atomics.wait only works in a Worker context.
// The consumer constructs the Worker themselves so their bundler handles
// the URL resolution — we just ship dist/worker.js alongside dist/browser.js.
//
// Typical consumer wiring:
//
//   import * as api from '@actual-app/api';
//
//   const worker = new Worker(
//     new URL('@actual-app/api/dist/worker.js', import.meta.url),
//     { type: 'module' },
//   );
//   await api.init({ worker, dataDir: '/documents', serverURL, password });

import type { InitConfig } from '@actual-app/core/server/main';

import { _setBrowserSend } from './browser/lib-stub';
import { rpc, setWorker, terminate } from './browser/rpc';

export * from './methods';
export * as utils from './utils';

// Wire methods.ts's `lib.send` through the worker.
_setBrowserSend((name, args) => rpc('send', { name, args }));

export type BrowserInitConfig = InitConfig & { worker: Worker };

export async function init(config: BrowserInitConfig) {
  if (!config || !config.worker) {
    throw new Error(
      '@actual-app/api: init({ worker }) requires a Worker instance. ' +
        'Create one with `new Worker(new URL("@actual-app/api/dist/worker.js", import.meta.url), { type: "module" })`.',
    );
  }

  setWorker(config.worker);

  // Strip the worker before forwarding — it isn't structured-cloneable.
  const { worker: _worker, ...rest } = config;
  await rpc('init', { config: rest });

  return {
    send: (name: string, args?: unknown) => rpc('send', { name, args }),
  };
}

export async function shutdown() {
  try {
    await rpc('shutdown');
  } finally {
    terminate();
  }
}
