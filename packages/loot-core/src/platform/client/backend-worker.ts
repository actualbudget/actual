import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread';

import * as connection from '#platform/client/connection';
import type { InitConfig } from '#server/main';

/**
 * Boot a backend Web Worker (see server/api-browser-worker.ts): install
 * absurd-sql's main-thread bridge (without it the worker's first sqlite write
 * hangs waiting for the IndexedDB helper to spawn), connect the client
 * connection, and run the server's init. `assetsBaseUrl` is where the worker
 * fetches loot-core's data files (sql wasm, default db, migrations) from.
 *
 * Used by @actual-app/api's browser entry; the desktop app has its own
 * multi-tab setup in browser-preload/.
 */
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
    { ...config, __assetsBaseUrl: assetsBaseUrl },
  );
}
