// @ts-strict-ignore
// Moved verbatim from packages/desktop-client/src/browser-preload.js — this
// is the SharedWorker-port → Worker-like adapter loot-core's client
// connection layer consumes. Works identically for any browser consumer
// that opts into multi-tab coordination.

import { createBackendWorker as initSQLBackend } from '#platform/client/backend-worker';
import { logger } from '#platform/server/log';

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
  localBackendWorker: Worker | null;
  backendWorkerUrl: URL;

  constructor(sharedPort: MessagePort, backendWorkerUrl: URL) {
    this._sharedPort = sharedPort;
    this._onmessage = null;
    this._listeners = [];
    this._started = false;
    this.localBackendWorker = null;
    this.backendWorkerUrl = backendWorkerUrl;

    // Listen for all messages from the SharedWorker port
    sharedPort.addEventListener('message', e => this._onSharedMessage(e));
  }

  set onmessage(handler) {
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

  postMessage(msg) {
    // All messages go through the SharedWorker for coordination.
    // The SharedWorker forwards to the leader's Worker via __to-worker.
    this._sharedPort.postMessage(msg);
  }

  addEventListener(type, handler) {
    this._listeners.push({ type, handler });
  }

  start() {
    if (!this._started) {
      this._started = true;
      this._sharedPort.start();
    }
  }

  _dispatch(event) {
    if (this._onmessage) this._onmessage(event);
    for (const { type, handler } of this._listeners) {
      if (type === 'message') handler(event);
    }
  }

  _onSharedMessage(event) {
    const msg = event.data;

    // Elected as leader: create the real backend Worker on this tab
    if (msg && msg.type === '__become-leader') {
      this._createLocalWorker(msg.initMsg, msg.budgetToRestore, msg.pendingMsg);
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
      if (this.localBackendWorker) {
        this.localBackendWorker.terminate();
        this.localBackendWorker = null;
      }
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
      logger.log(
        `[WorkerBridge] Role: ${msg.role}${msg.budgetId ? ` (budget: ${msg.budgetId})` : ''}`,
      );
      return;
    }

    // Surface SharedWorker console output in this tab's DevTools
    if (msg && msg.type === '__shared-worker-console') {
      const method = console[msg.level] || console.log;
      method(...msg.args);
      return;
    }

    // Respond to heartbeat pings
    if (msg && msg.type === '__heartbeat-ping') {
      this._sharedPort.postMessage({ type: '__heartbeat-pong' });
      return;
    }

    // Everything else goes to the connection layer
    this._dispatch(event);
  }

  _createLocalWorker(initMsg, budgetToRestore, pendingMsg) {
    if (this.localBackendWorker) {
      this.localBackendWorker.terminate();
    }
    this.localBackendWorker = new Worker(this.backendWorkerUrl);
    initSQLBackend(this.localBackendWorker);

    const sharedPort = this._sharedPort;
    const localWorker = this.localBackendWorker;
    localWorker.onmessage = workerEvent => {
      const workerMsg = workerEvent.data;
      // absurd-sql internal messages are handled by initSQLBackend
      if (
        workerMsg &&
        workerMsg.type &&
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
