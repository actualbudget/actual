import { createBackendWorker } from '#platform/client/backend-worker';
import { logger } from '#platform/server/log';

import { WorkerBridge } from './worker-bridge';

export type StartBackendInit = {
  version: string;
  isDev: boolean;
  publicUrl?: string;
  hash?: string;
};

export type StartBackendOptions = {
  /** URL of the backend Worker script to spawn. */
  backendWorkerUrl: URL;
  /** Payload posted to the worker (or shared coordinator) as its init msg. */
  initPayload: StartBackendInit;
  /**
   * Optional factory returning a SharedWorker instance. When provided, the
   * backend runs through loot-core's multi-tab coordinator (leader/follower).
   * Omit to always spawn a direct Worker on this page.
   */
  createSharedWorker?: () => SharedWorker;
  /**
   * Skip the SharedWorker path even if `createSharedWorker` is provided.
   * Typically wired to platform flags (e.g. Playwright tests, iOS).
   */
  forceDirectWorker?: boolean;
};

export type StartBackendHandle = Worker | WorkerBridge;

export function startBrowserBackend(
  opts: StartBackendOptions,
): StartBackendHandle {
  const {
    backendWorkerUrl,
    initPayload,
    createSharedWorker,
    forceDirectWorker,
  } = opts;

  // Use SharedWorker as a coordinator for multi-tab, multi-budget support.
  // Each budget gets its own leader tab running a dedicated Worker. All other
  // tabs on the same budget are followers — their messages are routed through
  // the SharedWorker to the leader's Worker.
  // The SharedWorker never touches SharedArrayBuffer, so this works on all
  // platforms including iOS/Safari.
  if (
    !forceDirectWorker &&
    typeof SharedWorker !== 'undefined' &&
    createSharedWorker
  ) {
    try {
      const sharedWorker = createSharedWorker();

      const sharedPort = sharedWorker.port;
      const bridge = new WorkerBridge(sharedPort, backendWorkerUrl);
      logger.log('[WorkerBridge] Connected to SharedWorker coordinator');

      // Don't call start() here. The port must remain un-started so that
      // messages (especially 'connect') are queued until connectWorker()
      // sets onmessage, which implicitly starts the port via the bridge.

      if (window.SharedArrayBuffer) {
        localStorage.removeItem('SharedArrayBufferOverride');
      }

      sharedPort.postMessage({
        type: 'init',
        ...initPayload,
        isSharedArrayBufferOverrideEnabled: localStorage.getItem(
          'SharedArrayBufferOverride',
        ),
      });
      bridge.markInitialized();

      window.addEventListener('beforeunload', () => {
        sharedPort.postMessage({ type: 'tab-closing' });
      });

      return bridge;
    } catch (e) {
      logger.log('SharedWorker failed, falling back to Worker:', e);
    }
  }

  // Fallback: regular Worker (Playwright, iOS, no SharedWorker support, the
  // consumer opted out by omitting createSharedWorker, or the path above threw).
  logger.log('[WorkerBridge] No SharedWorker available, using direct Worker');
  const backend = createBackendWorker(new Worker(backendWorkerUrl));

  if (window.SharedArrayBuffer) {
    localStorage.removeItem('SharedArrayBufferOverride');
  }

  backend.postMessage({
    type: 'init',
    ...initPayload,
    hasSharedArrayBuffer: !!window.SharedArrayBuffer,
    isSharedArrayBufferOverrideEnabled: localStorage.getItem(
      'SharedArrayBufferOverride',
    ),
  });

  // The connection layer consumes a raw Worker (onmessage/addEventListener);
  // createBackendWorker only needed the absurd-sql init side-effect here.
  return backend.worker;
}
