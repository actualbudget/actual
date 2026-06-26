import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread';

import * as connection from '#platform/client/connection';
import type { InitConfig } from '#server/main';

// initBackend installs absurd-sql's main-thread bridge — without it the
// worker's first sqlite write hangs.
export async function startBackendWorker(
  worker: Worker,
  config: InitConfig,
  assetsBaseUrl: string,
): Promise<void> {
  initBackend(worker);
  await connection.init(worker);
  // Worker-local handler, not part of the shared Handlers union.
  await (connection.send as (name: string, args?: unknown) => Promise<unknown>)(
    'api-browser/init',
    { config, assetsBaseUrl },
  );
}
