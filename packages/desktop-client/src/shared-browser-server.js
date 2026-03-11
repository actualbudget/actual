/* globals importScripts, backend */
// SharedWorker entry point for multi-tab support.
// All browser tabs share a single backend instance through this SharedWorker,
// preventing the sync conflicts that occur when multiple tabs each run their
// own backend with separate database connections and merkle tries.

let hasInitialized = false;
let backendConnected = false;

const connectedPorts = [];
// Maps request IDs to the port that sent them, so replies go to the right tab
const requestToPort = new Map();
// The port currently hosting the IDB child worker (created by initSQLBackend).
// Tracked explicitly so we can promote another tab if the host closes.
let idbHostPort = null;
// Saved __absurd:spawn-idb-worker message so we can re-forward it to a new host.
let lastSpawnMessage = null;

/**
 * importScripts with retry logic for loading the pre-compiled backend bundle.
 * Same as browser-server.js - needed because the backend build may finish
 * after the frontend in development.
 */
const importScriptsWithRetry = async (script, { maxRetries = 5 } = {}) => {
  try {
    importScripts(script);
  } catch (error) {
    if (maxRetries <= 0) {
      throw error;
    } else {
      console.groupCollapsed(
        `Failed to load backend, will retry ${maxRetries} more time(s)`,
      );
      console.log(error);
      console.groupEnd();
    }

    await new Promise((resolve, reject) =>
      setTimeout(() => {
        importScriptsWithRetry(script, {
          maxRetries: maxRetries - 1,
        }).then(resolve, reject);
      }, 5000),
    );
  }
};

/**
 * Override self.postMessage for absurd-sql compatibility.
 *
 * absurd-sql's IndexedDBBackend calls self.postMessage({type: '__absurd:spawn-idb-worker', ...})
 * to request an IndexedDB child worker. In a regular Worker, this goes to the main
 * thread where initSQLBackend handles it. In a SharedWorker, self.postMessage doesn't
 * exist natively, so we forward the message to the designated IDB host tab.
 * That tab has initSQLBackend set up on its port to create the child worker.
 * The child worker communicates with the backend via SharedArrayBuffer/Atomics,
 * so it works regardless of which tab's main thread hosts it.
 */
self.postMessage = function (msg) {
  if (msg && msg.type === '__absurd:spawn-idb-worker') {
    lastSpawnMessage = msg;
  }
  // Send to the designated IDB host, falling back to first available port
  const target =
    idbHostPort && connectedPorts.includes(idbHostPort)
      ? idbHostPort
      : connectedPorts[0];
  if (target) {
    if (!idbHostPort) {
      idbHostPort = target;
    }
    target.postMessage(msg);
  }
};

function broadcastToAll(msg) {
  for (const port of connectedPorts) {
    port.postMessage(msg);
  }
}

function removePort(port) {
  const idx = connectedPorts.indexOf(port);
  if (idx !== -1) {
    connectedPorts.splice(idx, 1);
  }
  // Clean up any pending requests for this port
  for (const [id, p] of requestToPort) {
    if (p === port) {
      requestToPort.delete(id);
    }
  }
  // If the IDB host tab closed, promote another tab and re-create the
  // IDB child worker so the backend retains database access.
  if (port === idbHostPort) {
    idbHostPort = connectedPorts.length > 0 ? connectedPorts[0] : null;
    if (idbHostPort && lastSpawnMessage) {
      idbHostPort.postMessage(lastSpawnMessage);
    }
  }
}

/**
 * Virtual channel that the backend uses for communication (passed to connection.init).
 *
 * It mimics a Worker's self by providing addEventListener and postMessage.
 * - Incoming messages from any tab's port are forwarded to the registered handler
 * - Outgoing replies are routed to the specific requesting port
 * - Outgoing push events are broadcast to all ports
 */
const virtualChannel = {
  _messageHandler: null,
  addEventListener(type, handler) {
    if (type === 'message') {
      virtualChannel._messageHandler = handler;
    }
  },
  postMessage(msg) {
    if (msg.type === 'reply' || msg.type === 'error') {
      // Route reply/error to the specific port that sent the request
      const port = requestToPort.get(msg.id);
      if (port) {
        port.postMessage(msg);
        requestToPort.delete(msg.id);
      }
    } else if (msg.type === 'connect') {
      backendConnected = true;
      broadcastToAll(msg);
    } else {
      // Broadcast push events, capture-exception, etc. to all ports
      broadcastToAll(msg);
    }
  },
};

let appInitFailureInterval;

self.onconnect = function (e) {
  const port = e.ports[0];
  connectedPorts.push(port);

  port.onmessage = async function (event) {
    try {
      const msg = event.data;

      // Tab closing notification - clean up the port
      if (msg.type === 'tab-closing') {
        removePort(port);
        return;
      }

      if (msg.type === 'init') {
        if (!hasInitialized) {
          hasInitialized = true;

          const isDev = !!msg.isDev;
          const hash = msg.hash;

          // The main thread checks SharedArrayBuffer availability and passes
          // the result here. We trust it because: (1) the main thread is the
          // authoritative cross-origin-isolation context, and (2) the actual
          // SharedArrayBuffer usage for absurd-sql's IDB child worker happens
          // on the main thread (forwarded via __absurd:spawn-idb-worker).
          if (
            !msg.hasSharedArrayBuffer &&
            !msg.isSharedArrayBufferOverrideEnabled
          ) {
            appInitFailureInterval = setInterval(() => {
              broadcastToAll({
                type: 'app-init-failure',
                SharedArrayBufferMissing: true,
              });
            }, 200);
            return;
          }

          try {
            await importScriptsWithRetry(
              `${msg.publicUrl}/kcab/kcab.worker.${hash}.js`,
              { maxRetries: isDev ? 5 : 0 },
            );

            backend.initApp(isDev, virtualChannel).catch(err => {
              console.log(err);
              appInitFailureInterval = setInterval(() => {
                broadcastToAll({
                  type: 'app-init-failure',
                  IDBFailure: err.message.includes('indexeddb-failure'),
                });
              }, 200);
            });
          } catch (error) {
            console.log('Failed initializing backend:', error);
            appInitFailureInterval = setInterval(() => {
              broadcastToAll({
                type: 'app-init-failure',
                BackendInitFailure: true,
              });
            }, 200);
          }
        } else if (backendConnected) {
          // Backend already initialized and connected - immediately connect this port
          port.postMessage({ type: 'connect' });
        }
        // If backend is initializing but not yet connected, the connect message
        // will be broadcast to all ports when the backend is ready
        return;
      }

      if (msg.name === '__app-init-failure-acknowledged') {
        clearInterval(appInitFailureInterval);
        return;
      }

      // Track which port sent this request for reply routing
      if (msg.id) {
        requestToPort.set(msg.id, port);
      }

      // Forward to backend message handler
      if (virtualChannel._messageHandler) {
        virtualChannel._messageHandler({ data: msg });
      }
    } catch (error) {
      console.log('Error in SharedWorker message handler:', error);
    }
  };

  port.start();
};
