import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;

// The worker hands sqlite work to absurd-sql, which needs SharedArrayBuffer and
// so a cross-origin isolated document. If startup stalls (commonly because a
// bundler re-processed the prebuilt worker and broke its RPC), the failure
// surfaces as an unhandled worker `error`/`messageerror` rather than a rejected
// promise, so `init` would hang forever without this guard.
const HANDSHAKE_TIMEOUT_MS = 30_000;
const BROWSER_DOCS_URL =
  'https://actualbudget.org/docs/api/#using-the-api-in-a-browser';
const BUNDLER_HINT =
  'If you bundled this app, your bundler may have re-processed the prebuilt ' +
  `worker. See ${BROWSER_DOCS_URL}`;

export async function init(
  config: InitConfig = {},
): Promise<{ send: typeof send }> {
  // Fail fast with an actionable message instead of a cryptic
  // "SharedArrayBuffer is not defined" deep inside the worker.
  if (
    typeof SharedArrayBuffer === 'undefined' ||
    !globalThis.crossOriginIsolated
  ) {
    throw new Error(
      'The Actual API browser build requires a cross-origin isolated ' +
        'document. Serve your app (and any embedding host) with the headers ' +
        '"Cross-Origin-Opener-Policy: same-origin" and ' +
        '"Cross-Origin-Embedder-Policy: require-corp", then reload. ' +
        `See ${BROWSER_DOCS_URL}`,
    );
  }

  // Compute the worker URL by string surgery rather than
  // `new Worker(new URL('./worker.js', import.meta.url))`: bundlers statically
  // match that exact form and re-bundle the prebuilt worker, which corrupts its
  // RPC so it posts a non-cloneable value at startup and `init` hangs. Keeping
  // the reference opaque makes bundlers leave it alone and load the prebuilt
  // worker verbatim. The worker must be served next to this file.
  const moduleBaseUrl = import.meta.url.replace(/[^/]+$/, '');
  worker = new Worker(moduleBaseUrl + 'worker.js', { type: 'module' });

  const assetsBaseUrl = config.assetsBaseUrl ?? moduleBaseUrl;
  try {
    await guardHandshake(
      worker,
      startBackendWorker(worker, config, assetsBaseUrl),
    );
  } catch (error) {
    worker.terminate();
    worker = null;
    throw error;
  }

  return { send };
}

// Reject if the worker errors or never completes the startup handshake, so a
// re-bundled/corrupt worker produces a clear error instead of hanging.
function guardHandshake(
  startingWorker: Worker,
  handshake: Promise<void>,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      startingWorker.removeEventListener('error', onError);
      startingWorker.removeEventListener('messageerror', onMessageError);
      clearTimeout(timer);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onError = (event: ErrorEvent) =>
      fail(
        new Error(
          `The Actual API worker failed to start: ${
            event.message || 'unknown error'
          }. ${BUNDLER_HINT}`,
        ),
      );
    const onMessageError = () =>
      fail(
        new Error(
          `The Actual API worker could not deserialize a startup message. ${BUNDLER_HINT}`,
        ),
      );
    const timer = setTimeout(
      () =>
        fail(
          new Error(
            `The Actual API worker did not finish starting within ${
              HANDSHAKE_TIMEOUT_MS / 1000
            }s. ${BUNDLER_HINT}`,
          ),
        ),
      HANDSHAKE_TIMEOUT_MS,
    );

    startingWorker.addEventListener('error', onError);
    startingWorker.addEventListener('messageerror', onMessageError);
    handshake.then(succeed, fail);
  });
}

export async function shutdown() {
  if (worker) {
    try {
      await send('sync');
    } catch {
      // most likely that no budget is loaded, so the sync failed
    }
    try {
      await send('close-budget');
    } finally {
      worker.terminate();
      worker = null;
    }
  }
}
