import * as fs from 'fs/promises';
import * as path from 'path';

// fake-indexeddb must be the first import so IDBRequest/IDBDatabase/etc. are
// on globalThis before any browser-platform module that references them.
import 'fake-indexeddb/auto';

// Vitest defaults NODE_ENV to 'test'; loot-core's browser fs short-circuits
// its init in that case, which skips populating the migrations / default-db
// that the api needs. Force 'development' so the real init path runs.
process.env.NODE_ENV = 'development';

// sqlite init reads PUBLIC_URL as the base for sql.js WASM locateFile; under
// jsdom there's no webpack-injected value. Seed one, then resolve the
// resulting paths to disk via the fetch polyfill below.
process.env.PUBLIC_URL = '/';

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value: unknown) =>
    JSON.parse(JSON.stringify(value));
}

const lootCoreRoot = path.join(__dirname, '..', '..', 'loot-core');
const sqlJsDist = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'node_modules',
  '@jlongster',
  'sql.js',
  'dist',
);

async function dataFileIndex(): Promise<string> {
  const lines: string[] = ['default-db.sqlite'];
  const migDir = path.join(lootCoreRoot, 'migrations');
  const entries = await fs.readdir(migDir);
  for (const name of entries.sort()) {
    lines.push('migrations/' + name);
  }
  return lines.join('\n') + '\n';
}

const originalFetch = globalThis.fetch;

globalThis.fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const urlStr =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const pathname = urlStr
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^file:\/\//, '');

  if (pathname === '/data-file-index.txt') {
    return new Response(await dataFileIndex(), { status: 200 });
  }

  let diskPath: string | null = null;
  if (
    pathname === '/data/default-db.sqlite' ||
    pathname === '/default-db.sqlite'
  ) {
    diskPath = path.join(lootCoreRoot, 'default-db.sqlite');
  } else if (pathname.startsWith('/data/migrations/')) {
    diskPath = path.join(lootCoreRoot, pathname.replace(/^\/data\//, ''));
  } else if (pathname.startsWith('/migrations/')) {
    diskPath = path.join(lootCoreRoot, pathname);
  } else if (pathname.endsWith('.wasm')) {
    diskPath = path.join(sqlJsDist, path.basename(pathname));
  }

  if (diskPath) {
    const buf = await fs.readFile(diskPath);
    const headers: Record<string, string> = {};
    if (pathname.endsWith('.wasm'))
      {headers['Content-Type'] = 'application/wasm';}
    return new Response(new Uint8Array(buf), { status: 200, headers });
  }

  return originalFetch(input as RequestInfo | URL, init);
}) as typeof fetch;

// /documents exists in the Emscripten virtual FS after fs.init(); /blobs or
// any other top-level dir would fail the non-recursive FS.mkdir in createBudget.
globalThis.__API_DATA_DIR__ = '/documents';
global.IS_TESTING = true;
