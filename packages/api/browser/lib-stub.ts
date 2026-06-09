// Browser main-thread stub for `@actual-app/core/server/main`.
//
// The real loot-core runs inside the worker (see browser-worker.ts). The
// main-thread bundle reuses packages/api/methods.ts verbatim, but that file
// reads `lib.send(...)` from loot-core. Resolving that import to this stub
// routes every call over postMessage instead of touching loot-core on the
// main thread.

export type BrowserSendFn = (name: string, args?: unknown) => Promise<unknown>;

let workerSend: BrowserSendFn = () => {
  return Promise.reject(
    new Error('@actual-app/api: call init() before any other method'),
  );
};

// Shape-cast rather than `typeof import(...)` so this stub stays
// module-graph-independent from the real loot-core.
export const lib = {
  send(name: string, args?: unknown) {
    return workerSend(name, args);
  },
} as unknown as {
  send: <T = unknown>(name: string, args?: unknown) => Promise<T>;
};

export function _setBrowserSend(fn: BrowserSendFn) {
  workerSend = fn;
}

// Inline InitConfig (matches loot-core's shape) so this stub does not force
// TS to pull in the real @actual-app/core/server/main module graph at all.
export type InitConfig = {
  dataDir?: string;
  serverURL?: string;
  password?: string;
  sessionToken?: string;
  verbose?: boolean;
};
