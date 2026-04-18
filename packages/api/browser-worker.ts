/// <reference lib="webworker" />

// Worker entry for @actual-app/api's browser build.
//
// This owns the real loot-core instance (sql.js + absurd-sql + IndexedDB)
// and speaks loot-core's existing backend protocol over postMessage:
//   main → worker: {id, name, args, undoTag?, catchErrors?}
//   worker → main: {type:'reply', id, result, mutated, undoTag}
//                  {type:'error', id, error}
//                  {type:'connect'}            (handshake heartbeat)
//
// Bootstrapping:
//   - We register an `api-browser/init` handler that runs loot-core's public
//     init(config), so the main-thread facade can kick off the DB + auth via
//     a normal RPC call. The reply carries no return value (loot-core's
//     `init(config)` resolves to `lib`, which isn't structured-cloneable).
//   - connection.init(self, handlers) starts the message loop and the
//     `{type:'connect'}` handshake loot-core's client connection expects.

import * as connection from '@actual-app/core/platform/server/connection';
import { handlers, init } from '@actual-app/core/server/main';
import type { InitConfig } from '@actual-app/core/server/main';

// `api-browser/init` is a worker-local handler; it isn't part of the shared
// Handlers type. Assign via the index-signature cast rather than extending
// the type globally.
(handlers as Record<string, (args?: unknown) => Promise<unknown>>)[
  'api-browser/init'
] = async function (args?: unknown) {
  const payload = (args ?? {}) as InitConfig & { __assetsBaseUrl?: string };
  // Main thread hands us a URL pointing at the api's own dist/ dir. Setting
  // PUBLIC_URL here is what makes loot-core's populateDefaultFilesystem
  // fetch `data-file-index.txt` / `data/<name>` / `sql-wasm.wasm` from our
  // package instead of the consumer's page origin — no manual copy step.
  const { __assetsBaseUrl, ...config } = payload;
  if (__assetsBaseUrl) {
    process.env.PUBLIC_URL = __assetsBaseUrl;
  }
  await init(config);
  // Nothing to return — the resolved `lib` has functions and isn't
  // structured-cloneable anyway.
};

self.addEventListener('error', e => {
  // eslint-disable-next-line no-console
  console.error(
    '[api worker] uncaught',
    (e as ErrorEvent).error ?? (e as ErrorEvent).message,
  );
});

self.addEventListener('unhandledrejection', e => {
  // eslint-disable-next-line no-console
  console.error(
    '[api worker] unhandled rejection',
    (e as PromiseRejectionEvent).reason,
  );
});

connection.init(self as unknown as Window, handlers);
