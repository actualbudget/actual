// Install absurd-sql's main-thread bridge for a browser backend Worker. Without
// it the worker's first sqlite write hangs: it posts `__absurd:spawn-idb-worker`
// and nothing spawns the IndexedDB helper. The desktop app does this in
// browser-preload/start.ts; the @actual-app/api facade calls this instead.

import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread';

export function initBrowserBackend(worker: Worker): void {
  initBackend(worker);
}
