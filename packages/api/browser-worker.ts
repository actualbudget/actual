// Web Worker entry for @actual-app/api's browser build. Owns the real
// loot-core backend; built standalone by vite.browser-worker.config.mts.

import * as connection from '@actual-app/core/platform/server/connection';
import { handlers, init } from '@actual-app/core/server/main';
import type { InitConfig } from '@actual-app/core/server/main';

// Consumer bundlers run import-analysis on `.js` URLs and choke on loot-core's
// JS migrations (`#`-subpath imports). The build ships those with a `.data`
// suffix so bundlers skip them; re-target `.js → .js.data` here, and rewrite the
// manifest back to `.js` so the migration runner finds them on-disk.
{
  const origFetch = globalThis.fetch;
  const MIGRATION_JS = /\/data\/migrations\/[^/?]+\.js(\?.*)?$/;
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    initArg?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === 'string' ? input : (input as URL | Request).toString();
    if (MIGRATION_JS.test(url)) {
      return origFetch(url.replace(/(\.js)(\?|$)/, '.js.data$2'), initArg);
    }
    if (url.endsWith('data-file-index.txt')) {
      const res = await origFetch(input, initArg);
      if (!res.ok) return res;
      const text = await res.text();
      return new Response(text.replace(/\.js\.data(\r?\n|$)/g, '.js$1'), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }
    return origFetch(input, initArg);
  }) as typeof fetch;
}

// Worker-local handler, not part of the shared Handlers type.
(handlers as Record<string, (args?: unknown) => Promise<unknown>>)[
  'api-browser/init'
] = async function (args?: unknown) {
  const { __assetsBaseUrl, ...config } = (args ?? {}) as InitConfig & {
    __assetsBaseUrl?: string;
  };
  if (__assetsBaseUrl) {
    process.env.PUBLIC_URL = __assetsBaseUrl;
  }
  await init(config);
};

connection.init(self, handlers);
