import { readFileSync } from 'node:fs';

import type { Plugin } from 'vite';

// `import bytes from './file?bytes'` inlines the file as a Uint8Array. Used
// to embed assets that backend init must read without hitting the network —
// SharedWorker fetches bypass the service-worker cache in some browser/PWA
// contexts, so anything fetched at init breaks offline app load.
const BYTES_QUERY = '?bytes';

export function bytesLoader(): Plugin {
  return {
    name: 'loot-core-bytes-loader',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (!id.endsWith(BYTES_QUERY)) return null;
      const base = id.slice(0, -BYTES_QUERY.length);
      // Delegate so package imports (`#path/...`) resolve via Vite/Rolldown.
      const resolved = await this.resolve(base, importer, { skipSelf: true });
      if (!resolved) return null;
      return resolved.id + BYTES_QUERY;
    },
    load(id) {
      if (!id.endsWith(BYTES_QUERY)) return null;
      const filePath = id.slice(0, -BYTES_QUERY.length);
      const base64 = readFileSync(filePath).toString('base64');
      // Block-scope the base64 + intermediate binary string so V8 can GC
      // them after the IIFE returns; only the Uint8Array stays resident.
      return `const bytes = (() => {
  const bin = atob(${JSON.stringify(base64)});
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
})();
export default bytes;
`;
    },
  };
}
