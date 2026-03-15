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
  port.postMessage({ type: '__role-change', role: 'LEADER' });
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
    `[SharedWorker] Tab connected (${connectedPorts.length} tabs, budget: ${currentBudgetId ?? 'none'})`,
  );

  port.onmessage = function (event) {
    try {
      const msg = event.data;

      // ── Tab lifecycle ──────────────────────────────────────────────

      if (msg.type === 'tab-closing') {
        pendingPongs.delete(port);
        removePort(port);
        return;
      }

      if (msg.type === '__heartbeat-pong') {
        pendingPongs.delete(port);
        return;
      }

      // ── Standalone coordination ────────────────────────────────────

      // Standalone tab is going off on its own Worker (different budget)
      if (msg.type === '__going-standalone') {
        standalonePorts.add(port);
        port.postMessage({ type: '__role-change', role: 'STANDALONE' });
        return;
      }

      // Standalone tab wants to rejoin the shared backend (after closing its budget)
      if (msg.type === '__rejoin-shared') {
        standalonePorts.delete(port);
        standaloneBudgets.delete(port);
        if (backendConnected) {
          port.postMessage({ type: '__role-change', role: 'FOLLOWER' });
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
        port.postMessage({ type: '__role-change', role: 'FOLLOWER' });
        return;
      }

      // ── Initialization ─────────────────────────────────────────────

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
          electLeader(port);
        } else if (backendConnected) {
          port.postMessage({ type: '__role-change', role: 'FOLLOWER' });
          port.postMessage({ type: 'connect' });
        } else if (lastAppInitFailure) {
          port.postMessage(lastAppInitFailure);
        }
        return;
      }

      // ── Worker message routing ──────────────────────────────────────

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
                      p.postMessage({ type: '__rejoin-budget' });
                    }
                  }
                }
              }
              // If a tab closed the budget, clear state and notify other tabs
              if (name === 'close-budget') {
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

      // ── Request interception & routing ──────────────────────────────

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

      // ── Default: track request and forward to leader ────────────────

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

        // If the leader is closing the budget but other followers still
        // have it open, transfer leadership instead of closing the
        // backend. The leader tab gets a synthetic reply so its UI
        // navigates to show-budgets, and a follower is promoted to keep
        // the budget running for remaining tabs.
        if (msg.name === 'close-budget' && port === leaderPort) {
          const followers = connectedPorts.filter(
            p => p !== port && !standalonePorts.has(p),
          );
          if (followers.length > 0) {
            const budgetToRestore = currentBudgetId;
            const newLeader = followers[0];
            console.log(
              `[SharedWorker] Leader closing budget but ${followers.length} follower(s) remain — transferring leadership`,
            );

            // Tell the leader tab to terminate its Worker and give
            // the UI a synthetic close-budget reply.
            port.postMessage({
              type: '__close-and-transfer',
              requestId: msg.id,
            });

            // Clear leader state
            leaderPort = null;
            backendConnected = false;
            lastAppInitFailure = null;
            currentBudgetId = null;
            requestToPort.clear();
            requestNames.clear();
            requestBudgetIds.clear();

            // Promote a follower as new leader; it creates a new
            // Worker and restores the same budget.
            electLeader(newLeader, budgetToRestore);
            return;
          }
        }

        // If a follower is closing the budget, don't forward to the
        // backend — the leader and other followers still need it.
        // Just send a synthetic reply so the follower's UI navigates
        // to show-budgets without disturbing anyone else.
        if (msg.name === 'close-budget' && port !== leaderPort) {
          port.postMessage({
            type: 'reply',
            id: msg.id,
            data: {},
          });
          requestToPort.delete(msg.id);
          requestNames.delete(msg.id);
          return;
        }

        // Budget-replacing operations (create-budget, create-demo-budget,
        // import-budget) destroy the currently loaded budget on disk and
        // replace it with a new one. If other tabs are using the shared
        // backend, push them to show-budgets first so they don't get
        // corrupted state. The requesting tab continues normally — it will
        // end up on the newly created budget.
        if (
          currentBudgetId !== null &&
          (msg.name === 'create-budget' ||
            msg.name === 'create-demo-budget' ||
            msg.name === 'import-budget')
        ) {
          const others = connectedPorts.filter(
            p => p !== port && !standalonePorts.has(p),
          );
          if (others.length > 0) {
            console.log(
              `[SharedWorker] Budget-replacing operation "${msg.name}" — pushing ${others.length} other tab(s) to show-budgets`,
            );
            for (const p of others) {
              p.postMessage({ type: 'push', name: 'show-budgets' });
            }
          }
        }
      }

      if (leaderPort) {
        leaderPort.postMessage({ type: '__to-worker', msg });
      }
    } catch (error) {
      console.error('[SharedWorker] Error in message handler:', error);
    }
  };

  port.start();
};
