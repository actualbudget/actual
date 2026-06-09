// Install absurd-sql's main-thread bridge for a browser backend Web Worker.
//
// Without this, the first sqlite write inside the worker hangs on
// Atomics.wait: the worker posts `__absurd:spawn-idb-worker` and nothing on
// the main thread spawns the IndexedDB helper worker in response.
//
// The desktop app does this inside browser-preload/start.ts. The
// @actual-app/api browser facade — which ships loot-core as an npm package and
// spawns its own worker — calls this instead. Message handling is left to the
// caller's connection layer (which already ignores absurd's `__`-prefixed
// internal messages).

import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread';

export function initBrowserBackend(worker: Worker): void {
  initBackend(worker);
}
