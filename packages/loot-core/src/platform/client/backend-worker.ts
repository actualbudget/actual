// Connect the client connection to a freshly spawned backend Worker, installing
// absurd-sql's main-thread bridge first (without it the worker's first sqlite
// write hangs: it posts `__absurd:spawn-idb-worker` and nothing spawns the
// IndexedDB helper). Used by the @actual-app/api browser facade; the desktop
// app has its own multi-tab setup in browser-preload/.

import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread';

import * as connection from '#platform/client/connection';

export async function connectBackendWorker(worker: Worker): Promise<void> {
  initBackend(worker);
  await connection.init(worker);
}
