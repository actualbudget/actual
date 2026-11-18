import { logger } from '#platform/server/log';
import type { StorageBackend } from '#platform/server/sqlite';
import * as Platform from '#shared/platform';

import { requestStorageRelease, WorkerBridge } from './worker-bridge';

export type StartBackendInit = {
  version: string;
  isDev: boolean;
  publicUrl?: string;
  hash?: string;
  /**
   * Engine for budget files (see `resolveStorageBackend`). Part of the init
   * message because the coordinator replays it to every new leader.
   */
  storageBackend?: StorageBackend;
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

const PAGE_RELEASE_REQUEST_ID = '__storage-release-page';
let activeHandle: StartBackendHandle | null = null;

export function startBrowserBackend(
  opts: StartBackendOptions,
): StartBackendHandle {
  const {
    backendWorkerUrl,
    initPayload,
    createSharedWorker,
    forceDirectWorker,
  } = opts;

  // Capacitor serves the app from a custom URL scheme, which WebKit never
  // treats as cross-origin isolated, so SharedArrayBuffer is unavailable in
  // the native mobile app. Always run it in the fallback mode there.
  if (Platform.isNativeMobileApp) {
    localStorage.setItem('SharedArrayBufferOverride', 'true');
  }

  // Use SharedWorker as a coordinator for multi-tab, multi-budget support.
  // Each budget gets its own leader tab running a dedicated Worker. All other
  // tabs on the same budget are followers — their messages are routed through
  // the SharedWorker to the leader's Worker.
  // The SharedWorker only routes messages, so this works on all platforms
  // including iOS/Safari.
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

      sharedPort.postMessage({
        type: 'init',
        ...initPayload,
      });
      bridge.markInitialized();

      window.addEventListener('beforeunload', () => {
        sharedPort.postMessage({ type: 'tab-closing' });
      });

      activeHandle = bridge;
      return bridge;
    } catch (e) {
      logger.log('SharedWorker failed, falling back to Worker:', e);
    }
  }

  // Fallback: regular Worker (Playwright, iOS, no SharedWorker support, the
  // consumer opted out by omitting createSharedWorker, or the path above threw).
  logger.log('[WorkerBridge] No SharedWorker available, using direct Worker');
  const worker = new Worker(backendWorkerUrl);

  worker.postMessage({
    type: 'init',
    ...initPayload,
  });

  activeHandle = worker;
  return worker;
}

/**
 * Asks the backend worker this page runs, if any, to let go of its storage,
 * for a page that is leaving. The browser frees a destroyed worker's locks
 * and access handles itself, but WebKit keeps those of a worker whose page
 * went into the back/forward cache, where they would block the next page's
 * open until the cached page is evicted. The request goes to this page's
 * own worker, never through the coordinator, which would hand it to the
 * leader; a follower runs no worker and has nothing to release.
 */
export function releaseBackendStorage() {
  const worker =
    activeHandle instanceof WorkerBridge
      ? activeHandle.localBackendWorker
      : activeHandle;
  if (worker) {
    requestStorageRelease(worker, PAGE_RELEASE_REQUEST_ID);
  }
}
