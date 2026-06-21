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
// Runtime assets, embedded by Vite at build time so the worker is fully
// self-contained (no PUBLIC_URL fetches). `?inline` yields a base64 data URL;
// `?raw` yields file text. The default DB and migrations come straight from
// loot-core, so they can never drift from what the Node build ships.
import wasmDataUrl from '@jlongster/sql.js/dist/sql-wasm.wasm?inline';

import defaultDbDataUrl from '../loot-core/default-db.sqlite?inline';

const migrationSources = import.meta.glob<string>(
  '../loot-core/migrations/*.{sql,js}',
  { query: '?raw', import: 'default', eager: true },
);

function dataUrlToBytes(dataUrl: string): Uint8Array<ArrayBuffer> {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// loot-core's populateDefaultFilesystem fetches `data-file-index.txt` and
// `data/<wireName>`. JS migrations get a `.data` suffix so consumer bundlers
// don't import-analyze them (loot-core strips it when writing into the worker
// FS). Build that wire format from the embedded sources.
const binData: Record<string, Uint8Array<ArrayBuffer>> = {
  'default-db.sqlite': dataUrlToBytes(defaultDbDataUrl),
};
const textData: Record<string, string> = {};
for (const [filePath, contents] of Object.entries(migrationSources)) {
  const name = filePath.slice(filePath.lastIndexOf('/') + 1);
  const wireName = name.endsWith('.js') ? `${name}.data` : name;
  textData[`migrations/${wireName}`] = contents;
}
const dataIndex =
  ['default-db.sqlite', ...Object.keys(textData).sort()].join('\n') + '\n';

setWasmBinary(dataUrlToBytes(wasmDataUrl));

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
      const key = rel.slice('data/'.length);
      if (key in binData) {
        return Promise.resolve(new Response(binData[key]));
      }
      if (key in textData) {
        return Promise.resolve(new Response(textData[key]));
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
  await init(config ?? {});
};

connection.init(self, handlers);
