// Browser worker entry for the web app's loot-core backend (`kcab.worker`).
//
// Wraps the real backend (`./main`) and makes the worker fully self-contained:
// the sql.js wasm and the default filesystem data (migrations + default budget
// DB) are embedded at build time, so `populateDefaultFilesystem()` no longer
// fetches them as separate, independently-cached static files.
//
// This keeps the AQL schema (compiled into this bundle) and its migrations
// co-versioned inside a single content-hashed artifact. It prevents the
// "no such column" errors that occur when a freshly-loaded bundle (e.g. after a
// hard refresh) runs against stale migration files served by an older
// service-worker cache — see issue #8290.

import {
  dataFiles,
  dataIndex,
  wasmBase64,
} from 'virtual:actual-embedded-assets';

import { setWasmBinary } from '#platform/server/sqlite';

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Instantiate sql.js from the embedded wasm instead of fetching `sql-wasm.wasm`.
setWasmBinary(base64ToBytes(wasmBase64));

// `populateDefaultFilesystem()` fetches `PUBLIC_URL + 'data-file-index.txt'` and
// `PUBLIC_URL + 'data/<file>'`. Answer those requests from the embedded bytes so
// the worker performs no default-filesystem asset fetches; everything else
// (server sync, etc.) falls through to the real fetch.
const PUBLIC_URL = process.env.PUBLIC_URL ?? '/';

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
  if (url.startsWith(PUBLIC_URL)) {
    const rel = url.slice(PUBLIC_URL.length);
    if (rel === 'data-file-index.txt') {
      return Promise.resolve(new Response(dataIndex));
    }
    if (rel.startsWith('data/')) {
      const b64 = dataFiles[rel.slice('data/'.length)];
      if (b64 != null) {
        return Promise.resolve(new Response(base64ToBytes(b64)));
      }
    }
  }
  return realFetch(input, fetchInit);
} as typeof fetch;

export * from './main';
