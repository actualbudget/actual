// SharedWorker coordinator for multi-tab support.
//
// This SharedWorker does NOT run the backend itself. Instead, it acts as a
// lightweight message router: one tab is elected "leader" and runs the real
// backend in a regular dedicated Worker (where SharedArrayBuffer is universally
// available). All other tabs send messages through this coordinator, which
// forwards them to the leader tab for processing.
//
// This design avoids the iOS/Safari issue where SharedArrayBuffer is unavailable
// inside SharedWorker contexts, causing absurd-sql's IDB fallback to break.

const connectedPorts = [];
// The port belonging to the leader tab (the one running the backend Worker)
let leaderPort = null;
// Cached init message so we can forward it when electing a new leader
let cachedInitMsg = null;
// Whether the leader's backend Worker has sent 'connect'
let backendConnected = false;
// Cached init-failure payload so late-joining tabs learn that init failed
let lastAppInitFailure = null;
// Maps request IDs to the port that sent them, so replies go to the right tab
const requestToPort = new Map();
// Maps request IDs to their message name (for close-budget cross-tab notification)
const requestNames = new Map();
// Ports that have not yet responded to the most recent heartbeat ping
const pendingPongs = new Set();
// Ports running their own standalone Worker (different budget). These stay
// connected for heartbeat and coordination but are excluded from message routing.
const standalonePorts = new Set();
// Maps standalone ports to the budget ID they are running
const standaloneBudgets = new Map();
// The budget currently loaded on the leader's backend Worker (null = no budget)
let currentBudgetId = null;
// Maps request IDs to the budget ID for in-flight load-budget requests
const requestBudgetIds = new Map();

// Forward SharedWorker console output to connected tabs so messages
// appear in regular DevTools without needing chrome://inspect/#workers.
const _originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
};

function forwardConsole(level, args) {
  _originalConsole[level](...args);
  const serialized = args.map(a => {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    }
    return String(a);
  });
  for (const port of connectedPorts) {
    port.postMessage({
      type: '__shared-worker-console',
      level,
      args: serialized,
    });
  }
}

console.log = (...args) => forwardConsole('log', args);
console.warn = (...args) => forwardConsole('warn', args);
console.error = (...args) => forwardConsole('error', args);
console.info = (...args) => forwardConsole('info', args);

function broadcastToAll(msg) {
  for (const port of connectedPorts) {
    if (!standalonePorts.has(port)) {
      port.postMessage(msg);
    }
  }
}

// Heartbeat: detect tabs that closed without sending 'tab-closing'
// (e.g. crash, mobile background kill, or missed beforeunload).
setInterval(() => {
  for (const port of [...pendingPongs]) {
    pendingPongs.delete(port);
    removePort(port);
  }
  for (const port of connectedPorts) {
    pendingPongs.add(port);
    port.postMessage({ type: '__heartbeat-ping' });
  }
}, 10_000);

function removePort(port) {
  const idx = connectedPorts.indexOf(port);
  if (idx !== -1) {
    connectedPorts.splice(idx, 1);
  }
  standalonePorts.delete(port);
  standaloneBudgets.delete(port);
  // Clean up any pending requests from this port
  for (const [id, p] of requestToPort) {
    if (p === port) {
      requestToPort.delete(id);
      requestNames.delete(id);
    }
  }
  // If the leader tab left, the backend Worker in that tab is gone.
  // Immediately promote another tab as leader with the same budget.
  if (port === leaderPort) {
    const budgetToRestore = currentBudgetId;
    leaderPort = null;
    backendConnected = false;
    lastAppInitFailure = null;
    currentBudgetId = null;
    requestToPort.clear();
    requestNames.clear();
    requestBudgetIds.clear();

    if (connectedPorts.length > 0) {
      // Pick the first non-standalone port to be the new leader
      const candidate = connectedPorts.find(p => !standalonePorts.has(p));
      if (candidate) {
        console.log(
          `[SharedWorker] Leader left, promoting new leader (budget: ${budgetToRestore ?? 'none'})`,
        );
        electLeader(candidate, budgetToRestore);
      }
    }
  }
}

function electLeader(port, budgetToRestore, pendingMsg) {
  leaderPort = port;
  console.log(
    `[SharedWorker] Elected new leader (${connectedPorts.length} tabs connected)`,
  );
  if (cachedInitMsg) {
    port.postMessage({
      type: '__become-leader',
      initMsg: cachedInitMsg,
      budgetToRestore: budgetToRestore || null,
      pendingMsg: pendingMsg || null,
    });
  }
}

self.onconnect = function (e) {
  const port = e.ports[0];
  connectedPorts.push(port);
  console.log(
    `[SharedWorker] Tab connected (${connectedPorts.length} total). Leader: ${leaderPort ? 'yes' : 'none'}, budget: ${currentBudgetId ?? 'none'}`,
  );

  port.onmessage = function (event) {
    try {
      const msg = event.data;

      if (msg.type === 'tab-closing') {
        console.log(
          `[SharedWorker] Tab closing (${connectedPorts.length - 1} will remain). Was leader: ${port === leaderPort}`,
        );
        pendingPongs.delete(port);
        removePort(port);
        return;
      }

      if (msg.type === '__heartbeat-pong') {
        pendingPongs.delete(port);
        return;
      }

      // Standalone tab is going off on its own Worker (different budget)
      if (msg.type === '__going-standalone') {
        console.log(
          `[SharedWorker] Tab going standalone (${connectedPorts.length} total, ${standalonePorts.size + 1} standalone)`,
        );
        standalonePorts.add(port);
        return;
      }

      // Standalone tab wants to rejoin the shared backend (after closing its budget)
      if (msg.type === '__rejoin-shared') {
        standalonePorts.delete(port);
        standaloneBudgets.delete(port);
        console.log(
          `[SharedWorker] Tab rejoining shared (${connectedPorts.length} total, ${standalonePorts.size} standalone)`,
        );
        if (backendConnected) {
          port.postMessage({ type: 'connect' });
        } else if (lastAppInitFailure) {
          port.postMessage(lastAppInitFailure);
        }
        return;
      }

      // Standalone tab acknowledging a __rejoin-budget (silent rejoin, no connect)
      if (msg.type === '__rejoin-budget-ack') {
        standalonePorts.delete(port);
        standaloneBudgets.delete(port);
        console.log(
          `[SharedWorker] Tab silently rejoined shared (${connectedPorts.length} total, ${standalonePorts.size} standalone)`,
        );
        return;
      }

      // Leader tab registering a restore-budget request so the reply
      // updates currentBudgetId (used after leader failover).
      if (msg.type === '__track-restore') {
        requestToPort.set(msg.requestId, port);
        requestNames.set(msg.requestId, 'load-budget');
        requestBudgetIds.set(msg.requestId, msg.budgetId);
        return;
      }

      if (msg.type === 'init') {
        cachedInitMsg = msg;
        if (!leaderPort) {
          console.log('[SharedWorker] No leader yet, electing this tab');
          electLeader(port);
        } else if (backendConnected) {
          console.log(
            '[SharedWorker] Backend already connected, sending connect to new tab',
          );
          port.postMessage({ type: 'connect' });
        } else if (lastAppInitFailure) {
          console.log(
            '[SharedWorker] Init previously failed, replaying failure to new tab',
          );
          port.postMessage(lastAppInitFailure);
        } else {
          console.log(
            '[SharedWorker] Backend still initializing, new tab will wait for connect broadcast',
          );
        }
        return;
      }

      // Leader tab forwarding its Worker's messages back for routing
      if (msg.type === '__from-worker') {
        const workerMsg = msg.msg;

        if (workerMsg.type === 'reply' || workerMsg.type === 'error') {
          const targetPort = requestToPort.get(workerMsg.id);
          if (targetPort) {
            targetPort.postMessage(workerMsg);

            const name = requestNames.get(workerMsg.id);
            if (workerMsg.type === 'reply') {
              // Track which budget the leader's Worker currently has loaded
              if (name === 'load-budget') {
                const budgetId = requestBudgetIds.get(workerMsg.id);
                if (budgetId) {
                  const oldBudgetId = currentBudgetId;
                  console.log(
                    `[SharedWorker] Budget loaded: "${budgetId}" (was: "${oldBudgetId ?? 'none'}")`,
                  );
                  currentBudgetId = budgetId;
                  requestBudgetIds.delete(workerMsg.id);

                  // If the leader changed budgets, followers on the old
                  // budget can no longer use the shared backend — push
                  // them back to the budget list.
                  if (oldBudgetId !== null && oldBudgetId !== budgetId) {
                    for (const p of connectedPorts) {
                      if (p !== targetPort && !standalonePorts.has(p)) {
                        console.log(
                          `[SharedWorker] Pushing follower to show-budgets (was on "${oldBudgetId}")`,
                        );
                        p.postMessage({
                          type: 'push',
                          name: 'show-budgets',
                        });
                      }
                    }
                  }

                  // If any standalone tab has the same budget, tell it to
                  // rejoin — both tabs should share the same backend.
                  for (const [p, sBudget] of standaloneBudgets) {
                    if (sBudget === budgetId) {
                      console.log(
                        `[SharedWorker] Standalone tab has same budget "${budgetId}" — telling it to rejoin`,
                      );
                      p.postMessage({ type: '__rejoin-budget' });
                    }
                  }
                }
              }
              // If a tab closed the budget, notify other tabs
              if (name === 'close-budget') {
                console.log(
                  '[SharedWorker] Budget closed, clearing currentBudgetId',
                );
                currentBudgetId = null;
                for (const p of connectedPorts) {
                  if (p !== targetPort && !standalonePorts.has(p)) {
                    p.postMessage({ type: 'push', name: 'show-budgets' });
                  }
                }
              }
            }

            requestToPort.delete(workerMsg.id);
            requestNames.delete(workerMsg.id);
          }
        } else if (workerMsg.type === 'connect') {
          backendConnected = true;
          broadcastToAll(workerMsg);
        } else if (workerMsg.type === 'app-init-failure') {
          lastAppInitFailure = workerMsg;
          broadcastToAll(workerMsg);
        } else {
          // Push events, capture-exception, etc.
          broadcastToAll(workerMsg);
        }
        return;
      }

      // If a non-leader tab wants to load a different budget from the one
      // the shared leader Worker already has, tell that tab to fall back to
      // its own standalone Worker so both budgets can run independently.
      // The leader tab is never redirected — it runs the backend Worker, so
      // it always loads directly and followers on the old budget are notified.
      if (msg.name === 'load-budget' && msg.args && msg.args.id) {
        const budgetId = msg.args.id;
        if (
          currentBudgetId !== null &&
          budgetId !== currentBudgetId &&
          port !== leaderPort
        ) {
          // Check if a standalone tab already has this budget. If so,
          // swap the leader instead of creating yet another standalone —
          // demote the current leader, promote the requesting tab, and
          // the existing standalone will rejoin once the budget loads.
          let hasStandaloneMatch = false;
          for (const [, sBudget] of standaloneBudgets) {
            if (sBudget === budgetId) {
              hasStandaloneMatch = true;
              break;
            }
          }

          if (hasStandaloneMatch) {
            console.log(
              `[SharedWorker] Leader swap: demoting leader (budget "${currentBudgetId}"), promoting for "${budgetId}"`,
            );

            // Demote current leader to standalone
            leaderPort.postMessage({ type: '__demote-to-standalone' });
            standalonePorts.add(leaderPort);
            standaloneBudgets.set(leaderPort, currentBudgetId);

            // Clear leader state
            leaderPort = null;
            backendConnected = false;
            lastAppInitFailure = null;
            currentBudgetId = null;
            requestToPort.clear();
            requestNames.clear();
            requestBudgetIds.clear();

            // Pre-register the pending load-budget so the reply routes
            // correctly and updates currentBudgetId.
            requestToPort.set(msg.id, port);
            requestNames.set(msg.id, 'load-budget');
            requestBudgetIds.set(msg.id, budgetId);

            // Elect requesting tab as new leader with the pending request
            electLeader(port, null, msg);
            return;
          }

          console.log(
            `[SharedWorker] Tab wants budget "${budgetId}" but leader has "${currentBudgetId}" — sending to standalone`,
          );
          standaloneBudgets.set(port, budgetId);
          port.postMessage({
            type: '__use-standalone',
            initMsg: cachedInitMsg,
            pendingMsg: msg,
          });
          return;
        }
      }

      // Regular request from a tab — track and forward to the leader
      if (msg.id) {
        requestToPort.set(msg.id, port);
        if (msg.name) {
          requestNames.set(msg.id, msg.name);
        }
        // Remember the budget ID for load-budget so we can set
        // currentBudgetId when the reply arrives successfully.
        if (msg.name === 'load-budget' && msg.args && msg.args.id) {
          requestBudgetIds.set(msg.id, msg.args.id);
        }
      }

      if (leaderPort) {
        leaderPort.postMessage({ type: '__to-worker', msg });
      }
    } catch (error) {
      console.log('Error in SharedWorker message handler:', error);
    }
  };

  port.start();
};
