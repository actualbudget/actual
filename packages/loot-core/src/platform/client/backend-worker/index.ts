// Shared main-thread bootstrap for the browser backend Web Worker.
//
// The same absurd-sql plumbing is needed by:
//   - packages/desktop-client/src/browser-preload.js (full multi-tab setup)
//   - packages/api/browser/rpc.ts                   (thin api consumer)
//
// Both need: initSQLBackend(worker) so absurd-sql's __absurd:spawn-idb-worker
// messages are handled, and a way to ignore those internal messages when
// consuming the channel for loot-core's {id, name, args} protocol.

// absurd-sql ships no types; see packages/api/typings/... for the node variant
// if we ever need it. For now we cast on import.
import { initBackend as initSQLBackend } from 'absurd-sql/dist/indexeddb-main-thread';

export type BackendWorker = {
  worker: Worker;
  /** Register a listener for non-internal messages from the worker. */
  onMessage: (handler: (data: unknown) => void) => () => void;
  /** Send a message to the worker (loot-core request shape or handshake ack). */
  postMessage: (msg: unknown) => void;
  /** Terminate the worker and drop all listeners. */
  terminate: () => void;
};

export function createBackendWorker(worker: Worker): BackendWorker {
  // Hooks __absurd:spawn-idb-worker; without this any sqlite write inside
  // the worker hangs on Atomics.wait because the IDB helper never spawns.
  initSQLBackend(worker);

  const listeners = new Set<(data: unknown) => void>();

  worker.addEventListener('message', event => {
    const data = (event as MessageEvent).data;
    if (isAbsurdMessage(data)) return;
    for (const listener of listeners) listener(data);
  });

  return {
    worker,
    onMessage(handler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
    postMessage(msg) {
      worker.postMessage(msg);
    },
    terminate() {
      worker.terminate();
      listeners.clear();
    },
  };
}

function isAbsurdMessage(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const type = (data as { type?: unknown }).type;
  return typeof type === 'string' && type.startsWith('__absurd:');
}
