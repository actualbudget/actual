// Moved from packages/desktop-client/src/browser-preload.js — the
// SharedWorker-port → Worker-like adapter that loot-core's client connection
// layer consumes. Works identically for any browser consumer that opts into
// multi-tab coordination; the only consumer-specific input is the URL of the
// backend Worker script (`backendWorkerUrl`), passed in by the caller.

import { initBackend as initSQLBackend } from 'absurd-sql/dist/indexeddb-main-thread';

import { logger } from '#platform/server/log';

type BridgeMessage = { type?: string; [key: string]: unknown };

/** The Worker-like surface the connection layer interacts with. */
export type WorkerLike = {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (msg: unknown) => void;
  addEventListener: (type: string, handler: (e: MessageEvent) => void) => void;
  start?: () => void;
  terminate?: () => void;
};

/**
 * WorkerBridge wraps a SharedWorker port and presents a Worker-like interface
 * (onmessage, postMessage, addEventListener, start) to the connection layer.
 *
 * The SharedWorker coordinator assigns each tab a role per budget:
 *   - LEADER: this tab runs the backend in a dedicated Worker
 *   - FOLLOWER: this tab routes messages through the SharedWorker to the leader
 *
 * Multiple budgets can be open simultaneously — each has its own leader.
 */
export class WorkerBridge {
  _sharedPort: MessagePort;
  _onmessage: ((e: MessageEvent) => void) | null;
  _listeners: Array<{ type: string; handler: (e: MessageEvent) => void }>;
  _started: boolean;
  _isInitialized: boolean;
  _currentBudgetId: string | null;
  _wasHidden: boolean;
  _onVisibilityChange: () => void;
  localBackendWorker: Worker | null;
  backendWorkerUrl: URL;

  constructor(sharedPort: MessagePort, backendWorkerUrl: URL) {
    this._sharedPort = sharedPort;
    this._onmessage = null;
    this._listeners = [];
    this._started = false;
    this._isInitialized = false;
    this._currentBudgetId = null;
    this._wasHidden = document.visibilityState === 'hidden';
    this.localBackendWorker = null;
    this.backendWorkerUrl = backendWorkerUrl;

    this._onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this._wasHidden = true;
      } else if (this._wasHidden) {
        this._wasHidden = false;
        this._resumeAssociation();
      }
    };

    // Listen for all messages from the SharedWorker port
    sharedPort.addEventListener('message', e => this._onSharedMessage(e));
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  set onmessage(handler: ((e: MessageEvent) => void) | null) {
    this._onmessage = handler;
    // Setting onmessage on a real MessagePort implicitly starts it.
    // We need to do this explicitly on the underlying port.
    if (!this._started) {
      this._started = true;
      this._sharedPort.start();
    }
  }

  get onmessage() {
    return this._onmessage;
  }

  postMessage(msg: unknown) {
    // All messages go through the SharedWorker for coordination.
    // The SharedWorker forwards to the leader's Worker via __to-worker.
    this._sharedPort.postMessage(msg);
  }

  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    this._listeners.push({ type, handler });
  }

  start() {
    if (!this._started) {
      this._started = true;
      this._sharedPort.start();
    }
  }

  _terminateLocalBackendWorker() {
    if (this.localBackendWorker) {
      this.localBackendWorker.terminate();
      this.localBackendWorker = null;
    }
  }

  _dispatch(event: MessageEvent) {
    if (this._onmessage) this._onmessage(event);
    for (const { type, handler } of this._listeners) {
      if (type === 'message') handler(event);
    }
  }

  _onSharedMessage(event: MessageEvent) {
    const msg = event.data as BridgeMessage;

    // Elected as leader: create the real backend Worker on this tab
    if (msg && msg.type === '__become-leader') {
      this._createLocalWorker(
        msg.initMsg,
        (msg.budgetToRestore as string | null) ?? null,
        (msg.pendingMsg as Record<string, unknown> | null) ?? null,
      );
      return;
    }

    // Forward requests from SharedWorker to our local Worker
    if (msg && msg.type === '__to-worker') {
      if (this.localBackendWorker) {
        this.localBackendWorker.postMessage(msg.msg);
      }
      return;
    }

    // Leadership transfer: this tab is closing the budget but other tabs
    // still need it. Terminate our Worker (don't actually close-budget on
    // the backend) and dispatch a synthetic reply so the UI navigates to
    // show-budgets normally.
    if (msg && msg.type === '__close-and-transfer') {
      logger.log('[WorkerBridge] Leadership transferred — terminating Worker');
      this._applyRole('UNASSIGNED', null);
      // Only dispatch a synthetic reply if there's an actual close-budget
      // request to complete. When requestId is null the eviction was
      // triggered externally (e.g. another tab deleted this budget).
      if (msg.requestId) {
        this._dispatch({
          data: { type: 'reply', id: msg.requestId, data: {} },
        } as MessageEvent);
      }
      return;
    }

    // Role change notification
    if (msg && msg.type === '__role-change') {
      const role = msg.role as string;
      const budgetId = (msg.budgetId as string | null) ?? null;
      this._applyRole(role, budgetId);
      logger.log(
        `[WorkerBridge] Role: ${role}${budgetId ? ` (budget: ${budgetId})` : ''}`,
      );
      return;
    }

    // Surface SharedWorker console output in this tab's DevTools. This is the
    // replay side of the coordinator's console forwarding, so it must use the
    // real console (not logger).
    if (msg && msg.type === '__shared-worker-console') {
      const level = msg.level as string;
      const consoleByLevel = console as unknown as Record<
        string,
        (...args: unknown[]) => void
      >;
      // oxlint-disable-next-line actual/prefer-logger-over-console
      const method = consoleByLevel[level] || console.log;
      method(...(msg.args as unknown[]));
      return;
    }

    // Respond to heartbeat pings
    if (msg && msg.type === '__heartbeat-ping') {
      this._sharedPort.postMessage({ type: '__heartbeat-pong' });
      return;
    }

    // Everything else goes to the connection layer
    if (msg && msg.type === 'push' && msg.name === 'show-budgets') {
      this._applyRole('UNASSIGNED', null);
    }
    this._dispatch(event);
  }

  markInitialized() {
    this._isInitialized = true;
  }

  _normalizeBudgetId(budgetId: string | null): string | null {
    if (
      typeof budgetId === 'string' &&
      budgetId.length > 0 &&
      !budgetId.startsWith('__')
    ) {
      return budgetId;
    }
    return null;
  }

  _applyRole(role: string, budgetId: string | null) {
    this._currentBudgetId = this._normalizeBudgetId(budgetId);

    if (role !== 'LEADER') {
      this._terminateLocalBackendWorker();
    }
  }

  _resumeAssociation() {
    if (!this._isInitialized) {
      return;
    }
    this._sharedPort.postMessage({
      type: '__resume-tab',
      budgetId: this._currentBudgetId,
    });
  }

  _createLocalWorker(
    initMsg: unknown,
    budgetToRestore: string | null,
    pendingMsg: Record<string, unknown> | null,
  ) {
    this._terminateLocalBackendWorker();
    const localWorker = new Worker(this.backendWorkerUrl);
    this.localBackendWorker = localWorker;
    initSQLBackend(localWorker);

    const sharedPort = this._sharedPort;
    localWorker.onmessage = workerEvent => {
      const workerMsg = workerEvent.data as BridgeMessage;
      // absurd-sql internal messages are handled by initSQLBackend
      if (
        workerMsg &&
        typeof workerMsg.type === 'string' &&
        workerMsg.type.startsWith('__absurd:')
      ) {
        return;
      }
      // After the backend connects, automatically reload the budget that was
      // open before the leader left (e.g. page refresh). This lets other tabs
      // continue working without being sent to the budget list.
      if (workerMsg.type === 'connect') {
        if (budgetToRestore) {
          logger.log(
            `[WorkerBridge] Backend connected, restoring budget "${budgetToRestore}"`,
          );
          const id = budgetToRestore;
          budgetToRestore = null;
          localWorker.postMessage({
            id: '__restore-budget',
            name: 'load-budget',
            args: { id },
            catchErrors: true,
          });
          // Tell SharedWorker to track the restore request so
          // currentBudgetId gets updated when the reply arrives.
          sharedPort.postMessage({
            type: '__track-restore',
            requestId: '__restore-budget',
            budgetId: id,
          });
        } else if (pendingMsg) {
          const toSend = pendingMsg;
          pendingMsg = null;
          localWorker.postMessage(toSend);
        }
      }
      sharedPort.postMessage({ type: '__from-worker', msg: workerMsg });
    };

    localWorker.postMessage(initMsg);
  }
}
