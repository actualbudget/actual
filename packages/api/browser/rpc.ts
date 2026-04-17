// Thin RPC glue between the main thread and a consumer-provided worker.
// The consumer constructs the Worker (so its bundler handles the URL) and
// hands it to init(); everything else goes through this module.

type ErrInfo = { name: string; message: string; stack?: string };
type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
};
type Response =
  | { id: number; result?: unknown }
  | { id: number; error: ErrInfo };

let worker: Worker | null = null;
const pending = new Map<number, Pending>();
let nextId = 0;

export function setWorker(w: Worker) {
  if (worker) worker.terminate();
  worker = w;
  worker.onmessage = (e: MessageEvent<Response>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if ('error' in e.data) {
      const info = e.data.error;
      const err = new Error(info.message || info.name || 'api worker error');
      if (info.name) err.name = info.name;
      if (info.stack) err.stack = info.stack;
      p.reject(err);
    } else {
      p.resolve(e.data.result);
    }
  };
  worker.onerror = (e: ErrorEvent) => {
    // eslint-disable-next-line no-console
    console.error('[@actual-app/api worker error]', e.message ?? e);
  };
}

export function rpc(op: string, payload?: unknown): Promise<unknown> {
  if (!worker) {
    return Promise.reject(
      new Error(
        '@actual-app/api: init({ worker }) must be called before any api method',
      ),
    );
  }
  const w = worker;
  return new Promise<unknown>((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    w.postMessage({ id, op, payload });
  });
}

export function terminate() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pending.clear();
}
