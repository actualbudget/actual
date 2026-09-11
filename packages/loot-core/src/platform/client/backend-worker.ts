import * as connection from '#platform/client/connection';
import type { InitConfig } from '#server/main';

export async function startBackendWorker(
  worker: Worker,
  config: InitConfig,
): Promise<void> {
  await connection.init(worker);
  // Worker-local handler, not part of the shared Handlers union.
  await (connection.send as (name: string, args?: unknown) => Promise<unknown>)(
    'api-browser/init',
    { config },
  );
}
