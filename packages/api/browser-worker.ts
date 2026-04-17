/// <reference lib="webworker" />

// Worker entry for @actual-app/api's browser build. Owns the real loot-core
// instance (sql.js + absurd-sql + IndexedDB), dispatches `send` calls, and
// handles the init/shutdown lifecycle.

import { init as initLootCore } from '@actual-app/core/server/main';
import type { lib as libType } from '@actual-app/core/server/main';

type Req =
  | {
      id: number;
      op: 'init';
      payload: { config: Parameters<typeof initLootCore>[0] };
    }
  | { id: number; op: 'shutdown' }
  | { id: number; op: 'send'; payload: { name: string; args?: unknown } };

let lib: typeof libType | null = null;

function errInfo(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name || 'Error',
      message: err.message,
      stack: err.stack,
    };
  }
  return { name: 'Non-Error', message: String(err) };
}

self.addEventListener('error', e => {
  // eslint-disable-next-line no-console
  console.error('[api worker] uncaught', e.error ?? e.message);
});
self.addEventListener('unhandledrejection', e => {
  // eslint-disable-next-line no-console
  console.error('[api worker] unhandled rejection', e.reason);
});

self.onmessage = async (e: MessageEvent<Req>) => {
  const { id } = e.data;
  try {
    let result: unknown = undefined;

    if (e.data.op === 'init') {
      lib = await initLootCore(e.data.payload.config);
      // Never return the lib handle itself — it contains functions and is
      // not structured-cloneable.
    } else if (e.data.op === 'shutdown') {
      if (lib) {
        try {
          await lib.send('sync');
        } catch {
          // most likely no budget loaded
        }
        try {
          await lib.send('close-budget');
        } catch {
          // ignore
        }
        lib = null;
      }
    } else if (e.data.op === 'send') {
      if (!lib) throw new Error('@actual-app/api: init has not been called');
      const { name, args } = e.data.payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await lib.send(name as any, args as any);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error('Unknown op: ' + (e.data as any).op);
    }

    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: errInfo(err) });
  }
};
