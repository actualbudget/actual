// SharedWorker coordinator for multi-tab, multi-budget support.
//
// Architecture:
//   - This SharedWorker is a pure message router. It never runs a backend.
//   - Each open budget has exactly ONE leader tab that runs a dedicated Worker
//     (where SharedArrayBuffer is universally available, including iOS/Safari).
//   - Additional tabs on the same budget become followers — their messages are
//     routed through the SharedWorker to the leader's Worker.
//   - Tabs on different budgets each get their own leader/follower group.
//   - The SharedWorker tracks per-budget groups and handles leader election,
//     failover, and cross-tab coordination.
//
// Data model:
//   budgetGroups: Map<budgetId, BudgetGroup>
//     BudgetGroup = { leaderPort, followers: Set<port>, backendConnected,
//                     requestToPort, requestNames, requestBudgetIds }
//   portToBudget: Map<port, budgetId>   — which budget a port belongs to
//   unassignedPorts: Set<port>          — connected but not yet on a budget

// ── State ────────────────────────────────────────────────────────────────

// All connected ports (for heartbeat + console forwarding)
const connectedPorts = [];
// Cached init message so we can forward it to new leaders
let cachedInitMsg = null;
// Cached init-failure payload so late-joining tabs learn init failed
let lastAppInitFailure = null;
// Ports that haven't responded to heartbeat
const pendingPongs = new Set();

// Per-budget group state
// budgetId → { leaderPort, followers, backendConnected, requestToPort, requestNames, requestBudgetIds }
const budgetGroups = new Map();
// port → budgetId (which group a port belongs to, null if unassigned)
const portToBudget = new Map();
// Ports that are connected but not yet assigned to any budget
const unassignedPorts = new Set();

function createBudgetGroup(leaderPort) {
  return {
    leaderPort,
    followers: new Set(),
    backendConnected: false,
    // Maps request IDs → port that sent them
    requestToPort: new Map(),
    // Maps request IDs → message name
    requestNames: new Map(),
    // Maps request IDs → budget ID (for in-flight load-budget)
    requestBudgetIds: new Map(),
  };
}

// ── Console forwarding ───────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────

function logState(action) {
  const groups = [];
  for (const [bid, g] of budgetGroups) {
    groups.push(`"${bid}": leader + ${g.followers.size} follower(s)`);
  }
  console.log(
    `[SharedWorker] ${action} — ${connectedPorts.length} tab(s), ${unassignedPorts.size} unassigned, groups: [${groups.join(', ') || 'none'}]`,
  );
}

function broadcastToGroup(budgetId, msg, excludePort) {
  const group = budgetGroups.get(budgetId);
  if (!group) return;
  if (group.leaderPort !== excludePort) {
    group.leaderPort.postMessage(msg);
  }
  for (const p of group.followers) {
    if (p !== excludePort) {
      p.postMessage(msg);
    }
  }
}

function broadcastToAllInGroup(budgetId, msg) {
  broadcastToGroup(budgetId, msg, null);
}

// ── Heartbeat ────────────────────────────────────────────────────────────

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

// ── Port removal & leader failover ──────────────────────────────────────

function removePort(port) {
  const idx = connectedPorts.indexOf(port);
  if (idx !== -1) connectedPorts.splice(idx, 1);
  unassignedPorts.delete(port);

  const budgetId = portToBudget.get(port);
  portToBudget.delete(port);
  if (!budgetId) return;

  const group = budgetGroups.get(budgetId);
  if (!group) return;

  if (port === group.leaderPort) {
    // Leader left — promote a follower
    if (group.followers.size > 0) {
      const candidate = group.followers.values().next().value;
      group.followers.delete(candidate);
      console.log(
        `[SharedWorker] Leader left budget "${budgetId}" — promoting follower`,
      );
      electLeader(budgetId, candidate, budgetId);
    } else {
      // No followers — remove the group entirely
      console.log(
        `[SharedWorker] Last tab left budget "${budgetId}" — removing group`,
      );
      budgetGroups.delete(budgetId);
    }
  } else {
    group.followers.delete(port);
    // Clean up any pending requests from this port
    for (const [id, p] of group.requestToPort) {
      if (p === port) {
        group.requestToPort.delete(id);
        group.requestNames.delete(id);
      }
    }
  }
}

// ── Leader election ─────────────────────────────────────────────────────

function electLeader(budgetId, port, budgetToRestore, pendingMsg) {
  let group = budgetGroups.get(budgetId);
  if (!group) {
    group = createBudgetGroup(port);
    budgetGroups.set(budgetId, group);
  } else {
    group.leaderPort = port;
    group.backendConnected = false;
    group.requestToPort.clear();
    group.requestNames.clear();
    group.requestBudgetIds.clear();
  }
  // Remove port from any previous group
  const prevBudget = portToBudget.get(port);
  if (prevBudget && prevBudget !== budgetId) {
    removePortFromGroup(port, prevBudget);
  }
  portToBudget.set(port, budgetId);
  unassignedPorts.delete(port);

  console.log(
    `[SharedWorker] Elected leader for "${budgetId}" (${group.followers.size} follower(s))`,
  );
  port.postMessage({
    type: '__role-change',
    role: 'LEADER',
    budgetId,
  });
  if (cachedInitMsg) {
    port.postMessage({
      type: '__become-leader',
      initMsg: cachedInitMsg,
      budgetToRestore: budgetToRestore || null,
      pendingMsg: pendingMsg || null,
    });
  }
}

function addFollower(budgetId, port) {
  const group = budgetGroups.get(budgetId);
  if (!group) return;

  // Remove from any previous group
  const prevBudget = portToBudget.get(port);
  if (prevBudget && prevBudget !== budgetId) {
    removePortFromGroup(port, prevBudget);
  }

  group.followers.add(port);
  portToBudget.set(port, budgetId);
  unassignedPorts.delete(port);

  port.postMessage({
    type: '__role-change',
    role: 'FOLLOWER',
    budgetId,
  });
  if (group.backendConnected) {
    port.postMessage({ type: 'connect' });
  }
}

function removePortFromGroup(port, budgetId) {
  const group = budgetGroups.get(budgetId);
  if (!group) return;
  group.followers.delete(port);
  for (const [id, p] of group.requestToPort) {
    if (p === port) {
      group.requestToPort.delete(id);
      group.requestNames.delete(id);
    }
  }
}

// Push every tab out of a budget group and tear it down. The leader's
// Worker is told to close-and-transfer (terminate without close-budget)
// and all tabs are sent to show-budgets.
function evictGroup(budgetId, excludePort) {
  const group = budgetGroups.get(budgetId);
  if (!group) return;

  const evicted = [];
  // Push followers out
  for (const p of group.followers) {
    if (p !== excludePort) {
      p.postMessage({ type: 'push', name: 'show-budgets' });
      portToBudget.delete(p);
      unassignedPorts.add(p);
      evicted.push(p);
    }
  }
  group.followers.clear();

  // Push the leader out (terminate its Worker)
  if (group.leaderPort && group.leaderPort !== excludePort) {
    group.leaderPort.postMessage({
      type: '__close-and-transfer',
      requestId: null, // no pending close-budget request
    });
    group.leaderPort.postMessage({ type: 'push', name: 'show-budgets' });
    portToBudget.delete(group.leaderPort);
    unassignedPorts.add(group.leaderPort);
    evicted.push(group.leaderPort);
  }

  budgetGroups.delete(budgetId);
  if (evicted.length > 0) {
    console.log(
      `[SharedWorker] Evicted ${evicted.length} tab(s) from budget "${budgetId}"`,
    );
  }
}

// ── Connection handler ──────────────────────────────────────────────────

self.onconnect = function (e) {
  const port = e.ports[0];
  connectedPorts.push(port);
  unassignedPorts.add(port);
  logState('Tab connected');

  port.onmessage = function (event) {
    try {
      const msg = event.data;
      const portBudget = portToBudget.get(port);
      const group = portBudget ? budgetGroups.get(portBudget) : null;

      // ── Tab lifecycle ────────────────────────────────────────────

      if (msg.type === 'tab-closing') {
        pendingPongs.delete(port);
        removePort(port);
        logState('Tab closed');
        return;
      }

      if (msg.type === '__heartbeat-pong') {
        pendingPongs.delete(port);
        return;
      }

      // ── Initialization ───────────────────────────────────────────

      if (msg.type === 'init') {
        cachedInitMsg = msg;
        // Tab is now connected but not on any budget yet.
        // It stays unassigned until it sends load-budget.
        // If there's a group with a connected backend, that means the
        // app is already running — just tell the tab to connect.
        // Otherwise check for init failure.
        if (lastAppInitFailure) {
          port.postMessage(lastAppInitFailure);
        } else {
          // Find any group that's connected to piggyback the connect event.
          // If no groups exist yet, this is the first tab — elect it as
          // leader for a "lobby" that will get a real budget when load-budget arrives.
          let anyConnected = false;
          for (const [, g] of budgetGroups) {
            if (g.backendConnected) {
              anyConnected = true;
              break;
            }
          }
          if (anyConnected) {
            // At least one backend is running. Tab can interact immediately.
            port.postMessage({ type: '__role-change', role: 'UNASSIGNED' });
            port.postMessage({ type: 'connect' });
          } else if (budgetGroups.size > 0) {
            // Backend is booting. Tab will get 'connect' when it's ready.
            port.postMessage({ type: '__role-change', role: 'UNASSIGNED' });
          } else {
            // First tab — elect as leader with no budget
            electLeader('__lobby', port);
          }
        }
        return;
      }

      // ── Leader tab forwarding Worker messages back ───────────────

      if (msg.type === '__from-worker') {
        if (!group || port !== group.leaderPort) return;
        const workerMsg = msg.msg;

        if (workerMsg.type === 'reply' || workerMsg.type === 'error') {
          const targetPort = group.requestToPort.get(workerMsg.id);
          if (targetPort) {
            targetPort.postMessage(workerMsg);

            const name = group.requestNames.get(workerMsg.id);
            if (workerMsg.type === 'reply' && name === 'load-budget') {
              const budgetId = group.requestBudgetIds.get(workerMsg.id);
              if (budgetId) {
                group.requestBudgetIds.delete(workerMsg.id);
                handleBudgetLoaded(port, portBudget, budgetId, targetPort);
              }
            }
            if (workerMsg.type === 'reply' && name === 'close-budget') {
              handleBudgetClosed(targetPort, portBudget);
            }
            // After a budget-replacing op (create/import), the backend
            // loaded a new budget but we don't know its ID yet. The
            // next load-prefs reply reveals it — rename the temp group.
            if (
              workerMsg.type === 'reply' &&
              name === 'load-prefs' &&
              portBudget &&
              portBudget.startsWith('__creating-') &&
              workerMsg.result &&
              workerMsg.result.id
            ) {
              handleBudgetLoaded(
                port,
                portBudget,
                workerMsg.result.id,
                targetPort,
              );
            }

            group.requestToPort.delete(workerMsg.id);
            group.requestNames.delete(workerMsg.id);
          }
        } else if (workerMsg.type === 'connect') {
          group.backendConnected = true;
          broadcastToAllInGroup(portBudget, workerMsg);
          // Also notify unassigned ports that a backend is ready
          for (const p of unassignedPorts) {
            p.postMessage(workerMsg);
          }
        } else if (workerMsg.type === 'app-init-failure') {
          lastAppInitFailure = workerMsg;
          broadcastToAllInGroup(portBudget, workerMsg);
        } else {
          broadcastToAllInGroup(portBudget, workerMsg);
        }
        return;
      }

      // ── Leader tab registering a budget restore ──────────────────

      if (msg.type === '__track-restore') {
        if (group) {
          group.requestToPort.set(msg.requestId, port);
          group.requestNames.set(msg.requestId, 'load-budget');
          group.requestBudgetIds.set(msg.requestId, msg.budgetId);
        }
        return;
      }

      // ── Request interception & routing ───────────────────────────

      // load-budget: assign to the right group (or create one)
      if (msg.name === 'load-budget' && msg.args && msg.args.id) {
        const budgetId = msg.args.id;
        const existingGroup = budgetGroups.get(budgetId);

        if (existingGroup && existingGroup.backendConnected) {
          // Budget already has a running backend — become a follower
          // and forward the load-budget to the existing leader
          addFollower(budgetId, port);
          existingGroup.requestToPort.set(msg.id, port);
          existingGroup.requestNames.set(msg.id, msg.name);
          existingGroup.requestBudgetIds.set(msg.id, budgetId);
          existingGroup.leaderPort.postMessage({ type: '__to-worker', msg });
          logState(`Tab joined budget "${budgetId}" as follower`);
          return;
        }

        if (existingGroup && !existingGroup.backendConnected) {
          // Group exists but backend isn't ready yet — add as follower,
          // queue the request for when the backend connects
          addFollower(budgetId, port);
          existingGroup.requestToPort.set(msg.id, port);
          existingGroup.requestNames.set(msg.id, msg.name);
          existingGroup.requestBudgetIds.set(msg.id, budgetId);
          existingGroup.leaderPort.postMessage({ type: '__to-worker', msg });
          logState(
            `Tab joined budget "${budgetId}" as follower (backend booting)`,
          );
          return;
        }

        // No group for this budget yet — this tab becomes the leader.
        // If it's currently in the lobby group, migrate it.
        if (portBudget === '__lobby') {
          migrateLobbyLeader(port, budgetId, msg);
        } else if (group && port === group.leaderPort) {
          // Leader is loading a different budget — push followers off first
          for (const p of group.followers) {
            p.postMessage({ type: 'push', name: 'show-budgets' });
            portToBudget.delete(p);
            unassignedPorts.add(p);
          }
          if (group.followers.size > 0) {
            console.log(
              `[SharedWorker] Leader switching budgets — pushed ${group.followers.size} follower(s) off "${portBudget}"`,
            );
            group.followers.clear();
          }
          group.requestToPort.set(msg.id, port);
          group.requestNames.set(msg.id, msg.name);
          group.requestBudgetIds.set(msg.id, budgetId);
          group.leaderPort.postMessage({ type: '__to-worker', msg });
        } else {
          // New budget, tab not in lobby — elect as new leader
          electLeader(budgetId, port, null, msg);
          const newGroup = budgetGroups.get(budgetId);
          if (newGroup) {
            newGroup.requestToPort.set(msg.id, port);
            newGroup.requestNames.set(msg.id, msg.name);
            newGroup.requestBudgetIds.set(msg.id, budgetId);
          }
          logState(`Tab became leader for new budget "${budgetId}"`);
        }
        return;
      }

      // close-budget: handle leader vs follower
      if (msg.name === 'close-budget' && group) {
        if (port === group.leaderPort) {
          if (group.followers.size > 0) {
            // Leader closing but followers remain — transfer leadership
            const newLeader = group.followers.values().next().value;
            group.followers.delete(newLeader);
            console.log(
              `[SharedWorker] Leader closing budget "${portBudget}" but ${group.followers.size + 1} tab(s) remain — transferring`,
            );
            port.postMessage({
              type: '__close-and-transfer',
              requestId: msg.id,
            });
            electLeader(portBudget, newLeader, portBudget);
            // Move the closing tab to unassigned
            portToBudget.delete(port);
            unassignedPorts.add(port);
            logState(`Leadership transferred for "${portBudget}"`);
            return;
          }
          // No followers — let the close go through normally
          group.requestToPort.set(msg.id, port);
          group.requestNames.set(msg.id, msg.name);
          group.leaderPort.postMessage({ type: '__to-worker', msg });
          return;
        } else {
          // Follower closing — synthetic reply, don't touch the backend
          group.followers.delete(port);
          portToBudget.delete(port);
          unassignedPorts.add(port);
          port.postMessage({ type: 'reply', id: msg.id, data: {} });
          logState(`Follower left budget "${portBudget}"`);
          return;
        }
      }

      // delete-budget: if another group is running this budget, evict it
      if (msg.name === 'delete-budget' && msg.args) {
        const targetId = msg.args.id;
        if (targetId && budgetGroups.has(targetId)) {
          evictGroup(targetId, port);
          logState(`Evicted group for deleted budget "${targetId}"`);
        }
        // After eviction the only Worker may be gone. If no connected
        // group remains, spin up a temporary Worker for this tab so
        // the delete can actually execute.
        let hasConnected = false;
        for (const [, g] of budgetGroups) {
          if (g.backendConnected) {
            hasConnected = true;
            break;
          }
        }
        if (!hasConnected) {
          const tempId = '__deleting-' + Date.now();
          electLeader(tempId, port, null, msg);
          const newGroup = budgetGroups.get(tempId);
          if (newGroup && msg.id) {
            newGroup.requestToPort.set(msg.id, port);
            newGroup.requestNames.set(msg.id, msg.name);
          }
          logState(`Tab became leader for budget deletion ("${tempId}")`);
          return;
        }
        // Otherwise fall through to default handler
      }

      // Budget-replacing operations (create/import/duplicate) change which
      // budget the Worker is running. They must only execute on the tab's
      // OWN Worker — never on another group's leader.
      if (
        msg.name === 'create-budget' ||
        msg.name === 'create-demo-budget' ||
        msg.name === 'import-budget' ||
        msg.name === 'duplicate-budget'
      ) {
        // Demo and test budgets use fixed IDs. If another group already
        // has that budget open, evict it before we recreate it.
        if (msg.name === 'create-demo-budget') {
          evictGroup('_demo-budget', port);
        } else if (
          msg.name === 'create-budget' &&
          msg.args &&
          msg.args.testMode
        ) {
          evictGroup('_test-budget', port);
        }
        if (group && port === group.leaderPort) {
          // Leader is creating/importing — push followers off first,
          // then forward to own Worker (falls through to default handler)
          for (const p of group.followers) {
            p.postMessage({ type: 'push', name: 'show-budgets' });
            portToBudget.delete(p);
            unassignedPorts.add(p);
          }
          if (group.followers.size > 0) {
            console.log(
              `[SharedWorker] Budget-replacing "${msg.name}" — pushed ${group.followers.size} tab(s) off "${portBudget}"`,
            );
            group.followers.clear();
          }
          // Fall through to default handler to forward to this leader's Worker
        } else {
          // Follower or unassigned tab — needs its own Worker.
          // Remove from current group if it's a follower.
          if (group) {
            group.followers.delete(port);
            portToBudget.delete(port);
            unassignedPorts.add(port);
          }
          const tempId = '__creating-' + Date.now();
          electLeader(tempId, port, null, msg);
          const newGroup = budgetGroups.get(tempId);
          if (newGroup && msg.id) {
            newGroup.requestToPort.set(msg.id, port);
            newGroup.requestNames.set(msg.id, msg.name);
          }
          logState(`Tab became leader for budget creation ("${tempId}")`);
          return;
        }
      }

      // ── Default: track and forward to leader ─────────────────────

      // If the port is unassigned, try to route to any available leader.
      // Non-budget messages (e.g. get-budgets) work the same regardless
      // of which backend Worker handles them.
      let targetGroup = group;
      if (!targetGroup) {
        for (const [, g] of budgetGroups) {
          if (g.backendConnected) {
            targetGroup = g;
            break;
          }
        }
      }

      if (targetGroup) {
        if (msg.id) {
          // Request expecting a reply — track so we can route the reply back
          targetGroup.requestToPort.set(msg.id, port);
          if (msg.name) {
            targetGroup.requestNames.set(msg.id, msg.name);
          }
          if (msg.name === 'load-budget' && msg.args && msg.args.id) {
            targetGroup.requestBudgetIds.set(msg.id, msg.args.id);
          }
        }
        // Forward to the leader's Worker (both requests and
        // fire-and-forget messages like client-connected-to-backend)
        targetGroup.leaderPort.postMessage({ type: '__to-worker', msg });
      }
    } catch (error) {
      console.error('[SharedWorker] Error in message handler:', error);
    }
  };

  port.start();
};

// ── Budget lifecycle helpers ────────────────────────────────────────────

function handleBudgetLoaded(
  leaderPort,
  oldGroupId,
  newBudgetId,
  requestingPort,
) {
  const oldGroup = budgetGroups.get(oldGroupId);
  if (!oldGroup) return;

  if (oldGroupId !== newBudgetId) {
    // Leader loaded a real budget (from lobby or different budget).
    const existingTarget = budgetGroups.get(newBudgetId);
    if (existingTarget && existingTarget !== oldGroup) {
      // Another group already owns this budget — can't rename. This
      // shouldn't happen in practice because load-budget routing would
      // have redirected to the existing group. Just log a warning.
      console.warn(
        `[SharedWorker] handleBudgetLoaded: conflict — group "${newBudgetId}" already exists`,
      );
      return;
    }
    budgetGroups.delete(oldGroupId);
    budgetGroups.set(newBudgetId, oldGroup);
    portToBudget.set(leaderPort, newBudgetId);

    // Update all followers to the new budget ID
    for (const p of oldGroup.followers) {
      portToBudget.set(p, newBudgetId);
    }

    console.log(
      `[SharedWorker] Budget loaded: "${newBudgetId}" (leader + ${oldGroup.followers.size} follower(s))`,
    );
  }

  logState(`Budget "${newBudgetId}" ready`);
}

function handleBudgetClosed(closingPort, budgetId) {
  const group = budgetGroups.get(budgetId);
  if (!group) return;

  if (closingPort === group.leaderPort && group.followers.size === 0) {
    // Last tab closed the budget — clean up the group
    budgetGroups.delete(budgetId);
    portToBudget.delete(closingPort);
    unassignedPorts.add(closingPort);
    logState(`Budget "${budgetId}" closed (no tabs remain)`);
  }
}

function migrateLobbyLeader(port, budgetId, pendingMsg) {
  const lobbyGroup = budgetGroups.get('__lobby');
  if (lobbyGroup && port === lobbyGroup.leaderPort) {
    // Rename the lobby group directly — the Worker is already running
    budgetGroups.delete('__lobby');
    budgetGroups.set(budgetId, lobbyGroup);
    portToBudget.set(port, budgetId);
    lobbyGroup.requestToPort.set(pendingMsg.id, port);
    lobbyGroup.requestNames.set(pendingMsg.id, pendingMsg.name);
    lobbyGroup.requestBudgetIds.set(pendingMsg.id, budgetId);
    lobbyGroup.leaderPort.postMessage({ type: '__to-worker', msg: pendingMsg });
    port.postMessage({
      type: '__role-change',
      role: 'LEADER',
      budgetId,
    });
    logState(`Lobby leader now on budget "${budgetId}"`);
  }
}
