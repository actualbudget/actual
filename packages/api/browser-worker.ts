// Web Worker entry for the browser build; owns the real loot-core backend.
//
// Fully self-contained: the sql.js wasm and the default filesystem data
// (migrations + default budget DB) are embedded at build time. The worker
// performs NO `PUBLIC_URL` asset fetches, so a consumer needs to serve no extra
// files and configure no bundler — just `import` the package and `init()`.

import * as connection from '@actual-app/core/platform/server/connection';
import { setWasmBinary } from '@actual-app/core/platform/server/sqlite';
import { handlers, init } from '@actual-app/core/server/main';
import type { InitConfig } from '@actual-app/core/server/main';
// Runtime assets, base64-embedded at build time so the worker is fully
// self-contained (no PUBLIC_URL fetches). The bytes come from loot-core's
// `default-filesystem` helper via the `actual-embedded-assets` Vite plugin, so
// they can never drift from what the Node build ships.
import {
  dataFiles,
  dataIndex,
  wasmBase64,
} from 'virtual:actual-embedded-assets';

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

setWasmBinary(base64ToBytes(wasmBase64));

// loot-core fetches the default filesystem from `PUBLIC_URL + 'data-file-index.txt'`
// and `PUBLIC_URL + 'data/<file>'`. Point PUBLIC_URL at a sentinel origin and
// answer those requests from the embedded bytes; everything else (server sync)
// falls through to the real fetch.
const EMBEDDED_BASE = 'https://actual-embedded.invalid/';
process.env.PUBLIC_URL = EMBEDDED_BASE;

const realFetch = self.fetch.bind(self);
self.fetch = function patchedFetch(
  input: RequestInfo | URL,
  fetchInit?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.startsWith(EMBEDDED_BASE)) {
    const rel = url.slice(EMBEDDED_BASE.length);
    if (rel === 'data-file-index.txt') {
      return Promise.resolve(new Response(dataIndex));
    }
    if (rel.startsWith('data/')) {
      const b64 = dataFiles[rel.slice('data/'.length)];
      if (b64 != null) {
        return Promise.resolve(new Response(base64ToBytes(b64)));
      }
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  }
  return realFetch(input, fetchInit);
} as typeof fetch;

// Worker-local handler, not part of the shared Handlers type.
(handlers as Record<string, (args?: unknown) => Promise<unknown>>)[
  'api-browser/init'
] = async function (args?: unknown) {
  const { config } = (args ?? {}) as { config?: InitConfig };
  // There is no meaningful `process.cwd()` to fall back to in a worker
  await init({ dataDir: '/documents', ...config });
};

connection.init(self, handlers);
