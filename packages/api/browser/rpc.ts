// Main-thread RPC bridge to the api worker.
//
// Reuses `createBackendWorker` from loot-core so absurd-sql's main-thread
// plumbing (IDB helper worker, __absurd:* filtering) stays in one place.
// Speaks loot-core's existing backend protocol:
//   out: {id, name, args, catchErrors?}
//   in : {type:'reply', id, result, error?}
//        {type:'error', id, error}
//        {type:'connect'}     (handshake heartbeat)
//        {type:'push', name, args}
//
// We handle the handshake by replying {name:'client-connected-to-backend'}
// on the first 'connect'. Messages sent before handshake completes are
// queued.

import { createBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import type { BackendWorker } from '@actual-app/core/platform/client/backend-worker';

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
};

type Reply =
  | {
      type: 'reply';
      id: string;
      result?: unknown;
      error?: { type?: string; message?: string; [k: string]: unknown };
    }
  | {
      type: 'error';
      id: string;
      error: { type?: string; message?: string; [k: string]: unknown };
    };

let backend: BackendWorker | null = null;
let connected = false;
let queue: Array<{ id: string; name: string; args?: unknown }> = [];
const pending = new Map<string, Pending>();

function nextId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function toError(info: { type?: string; message?: string } | undefined) {
  const msg = info?.message || info?.type || 'api worker error';
  const err = new Error(msg);
  if (info?.type) err.name = info.type;
  return err;
}

export function setWorker(worker: Worker): BackendWorker {
  if (backend) {
    backend.terminate();
  }

  connected = false;
  queue = [];
  pending.clear();

  backend = createBackendWorker(worker);

  backend.onMessage((data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const msg = data as { type?: string; name?: string };

    if (msg.type === 'connect') {
      if (!connected) {
        connected = true;
        backend!.postMessage({ name: 'client-connected-to-backend' });
        // Drain anything queued while waiting for the handshake.
        const drained = queue;
        queue = [];
        for (const m of drained) backend!.postMessage(m);
      }
      return;
    }

    if (msg.type === 'reply' || msg.type === 'error') {
      const reply = msg as Reply;
      const p = pending.get(reply.id);
      if (!p) return;
      pending.delete(reply.id);
      if (reply.type === 'error') {
        p.reject(toError(reply.error));
      } else if ('error' in reply && reply.error) {
        // api/* handlers funnel errors through the reply envelope.
        p.reject(toError(reply.error));
      } else {
        p.resolve(reply.result);
      }
      return;
    }

    // push/capture-exception/etc. — ignore for now; the api consumer
    // doesn't subscribe to loot-core's server events.
  });

  return backend;
}

export function rpc(name: string, args?: unknown): Promise<unknown> {
  if (!backend) {
    return Promise.reject(
      new Error('@actual-app/api: init() must be called before any api method'),
    );
  }
  return new Promise((resolve, reject) => {
    const id = nextId();
    pending.set(id, { resolve, reject });
    const msg = { id, name, args };
    if (connected) {
      backend!.postMessage(msg);
    } else {
      queue.push(msg);
    }
  });
}

export function terminate() {
  if (backend) {
    backend.terminate();
    backend = null;
  }
  connected = false;
  queue = [];
  pending.clear();
}
