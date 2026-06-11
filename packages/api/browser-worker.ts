// Web Worker entry for the browser build; owns the real loot-core backend.

import * as connection from '@actual-app/core/platform/server/connection';
import { handlers, init } from '@actual-app/core/server/main';
import type { InitConfig } from '@actual-app/core/server/main';

// Worker-local handler, not part of the shared Handlers type.
(handlers as Record<string, (args?: unknown) => Promise<unknown>>)[
  'api-browser/init'
] = async function (args?: unknown) {
  const { config, assetsBaseUrl } = (args ?? {}) as {
    config?: InitConfig;
    assetsBaseUrl?: string;
  };
  if (assetsBaseUrl) {
    process.env.PUBLIC_URL = assetsBaseUrl;
  }
  await init(config ?? {});
};

connection.init(self, handlers);
