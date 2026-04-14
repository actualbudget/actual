// Core coordinator logic for multi-tab, multi-budget SharedWorker support.
//
// This module exports a factory so it can be tested independently.
// The SharedWorker entry point (shared-browser-server.js) calls
// createCoordinator() and wires the result to self.onconnect.

// ── Types ────────────────────────────────────────────────────────────────

type ConsoleLevel = 'log' | 'warn' | 'error' | 'info';

/** Minimal port interface (subset of MessagePort used by the coordinator). */
export type CoordinatorPort = {
  postMessage(msg: unknown): void;
  start(): void;
  onmessage: ((event: { data: Record<string, unknown> }) => void) | null;
};

type BudgetGroup = {
  leaderPort: CoordinatorPort;
  followers: Set<CoordinatorPort>;
  backendConnected: boolean;
  requestToPort: Map<string, CoordinatorPort>;
  requestNames: Map<string, string>;
  requestBudgetIds: Map<string, string>;
};

type CoordinatorOptions = {
  enableConsoleForwarding?: boolean;
};

// ── Factory ──────────────────────────────────────────────────────────────

export function createCoordinator({
  enableConsoleForwarding = false,
}: CoordinatorOptions = {}) {
  // ── State ──────────────────────────────────────────────────────────────

  const connectedPorts: CoordinatorPort[] = [];
  let cachedInitMsg: Record<string, unknown> | null = null;
  let lastAppInitFailure: Record<string, unknown> | null = null;
  const pendingPongs = new Set<CoordinatorPort>();

  const budgetGroups = new Map<string, BudgetGroup>();
  const portToBudget = new Map<CoordinatorPort, string>();
  const unassignedPorts = new Set<CoordinatorPort>();

  // ── Console forwarding ─────────────────────────────────────────────────

  if (enableConsoleForwarding) {
    const _originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
    };

    function forwardConsole(level: ConsoleLevel, args: unknown[]) {
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

    console.log = (...args: unknown[]) => forwardConsole('log', args);
    console.warn = (...args: unknown[]) => forwardConsole('warn', args);
    console.error = (...args: unknown[]) => forwardConsole('error', args);
    console.info = (...args: unknown[]) => forwardConsole('info', args);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  function createBudgetGroup(leaderPort: CoordinatorPort): BudgetGroup {
    return {
      leaderPort,
      followers: new Set(),
      backendConnected: false,
      requestToPort: new Map(),
      requestNames: new Map(),
      requestBudgetIds: new Map(),
    };
  }

  function logState(action: string) {
    const groups: string[] = [];
    for (const [bid, g] of budgetGroups) {
      groups.push(`"${bid}": leader + ${g.followers.size} follower(s)`);
    }
    console.log(
      `[SharedWorker] ${action} — ${connectedPorts.length} tab(s), ${unassignedPorts.size} unassigned, groups: [${groups.join(', ') || 'none'}]`,
    );
  }

  function broadcastToGroup(
    budgetId: string,
    msg: unknown,
    excludePort: CoordinatorPort | null,
  ) {
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

  function broadcastToAllInGroup(budgetId: string, msg: unknown) {
    broadcastToGroup(budgetId, msg, null);
  }

  // ── Heartbeat ──────────────────────────────────────────────────────────

  const heartbeatId = setInterval(() => {
    for (const port of [...pendingPongs]) {
      pendingPongs.delete(port);
      removePort(port);
    }
    for (const port of connectedPorts) {
      pendingPongs.add(port);
      port.postMessage({ type: '__heartbeat-ping' });
    }
  }, 10_000);

  // ── Port removal & leader failover ────────────────────────────────────

  function removePort(port: CoordinatorPort) {
    const idx = connectedPorts.indexOf(port);
    if (idx !== -1) connectedPorts.splice(idx, 1);
    unassignedPorts.delete(port);

    const budgetId = portToBudget.get(port);
    portToBudget.delete(port);
    if (!budgetId) return;

    const group = budgetGroups.get(budgetId);
    if (!group) return;

    if (port === group.leaderPort) {
      if (group.followers.size > 0) {
        const candidate = group.followers.values().next()
          .value as CoordinatorPort;
        group.followers.delete(candidate);
        console.log(
          `[SharedWorker] Leader left budget "${budgetId}" — promoting follower`,
        );
        electLeader(budgetId, candidate, budgetId);
      } else {
        console.log(
          `[SharedWorker] Last tab left budget "${budgetId}" — removing group`,
        );
        budgetGroups.delete(budgetId);
      }
    } else {
      group.followers.delete(port);
      for (const [id, p] of group.requestToPort) {
        if (p === port) {
          group.requestToPort.delete(id);
          group.requestNames.delete(id);
        }
      }
    }
  }

  // ── Leader election ───────────────────────────────────────────────────

  function electLeader(
    budgetId: string,
    port: CoordinatorPort,
    budgetToRestore?: string | null,
    pendingMsg?: Record<string, unknown> | null,
  ) {
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

  function addFollower(budgetId: string, port: CoordinatorPort) {
    const group = budgetGroups.get(budgetId);
    if (!group) return;

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

  function removePortFromGroup(port: CoordinatorPort, budgetId: string) {
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

  function evictGroup(budgetId: string, excludePort: CoordinatorPort) {
    const group = budgetGroups.get(budgetId);
    if (!group) return;

    const evicted: CoordinatorPort[] = [];
    for (const p of group.followers) {
      if (p !== excludePort) {
        p.postMessage({ type: 'push', name: 'show-budgets' });
        portToBudget.delete(p);
        unassignedPorts.add(p);
        evicted.push(p);
      }
    }
    group.followers.clear();

    if (group.leaderPort && group.leaderPort !== excludePort) {
      group.leaderPort.postMessage({
        type: '__close-and-transfer',
        requestId: null,
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

  // ── Budget lifecycle helpers ──────────────────────────────────────────

  function handleBudgetLoaded(
    leaderPort: CoordinatorPort,
    oldGroupId: string,
    newBudgetId: string,
  ) {
    const oldGroup = budgetGroups.get(oldGroupId);
    if (!oldGroup) return;

    if (oldGroupId !== newBudgetId) {
      const existingTarget = budgetGroups.get(newBudgetId);
      if (existingTarget && existingTarget !== oldGroup) {
        console.warn(
          `[SharedWorker] handleBudgetLoaded: conflict — group "${newBudgetId}" already exists`,
        );
        return;
      }
      budgetGroups.delete(oldGroupId);
      budgetGroups.set(newBudgetId, oldGroup);
      portToBudget.set(leaderPort, newBudgetId);

      for (const p of oldGroup.followers) {
        portToBudget.set(p, newBudgetId);
      }

      console.log(
        `[SharedWorker] Budget loaded: "${newBudgetId}" (leader + ${oldGroup.followers.size} follower(s))`,
      );
    }

    logState(`Budget "${newBudgetId}" ready`);
  }

  function handleBudgetClosed(closingPort: CoordinatorPort, budgetId: string) {
    const group = budgetGroups.get(budgetId);
    if (!group) return;

    if (closingPort === group.leaderPort && group.followers.size === 0) {
      budgetGroups.delete(budgetId);
      portToBudget.delete(closingPort);
      unassignedPorts.add(closingPort);
      logState(`Budget "${budgetId}" closed (no tabs remain)`);

      // if it was the last group, re-establish a lobby so the tab can
      // still route messages
      if (budgetGroups.size === 0) {
        unassignedPorts.delete(closingPort);
        const lobbyGroup = createBudgetGroup(closingPort);
        lobbyGroup.backendConnected = true;
        budgetGroups.set('__lobby', lobbyGroup);
        portToBudget.set(closingPort, '__lobby');
        logState('Re-established lobby after last budget closed');
      }
    }
  }

  function migrateLobbyLeader(
    port: CoordinatorPort,
    budgetId: string,
    pendingMsg: Record<string, unknown>,
  ) {
    const lobbyGroup = budgetGroups.get('__lobby');
    if (lobbyGroup && port === lobbyGroup.leaderPort) {
      budgetGroups.delete('__lobby');
      budgetGroups.set(budgetId, lobbyGroup);
      portToBudget.set(port, budgetId);
      lobbyGroup.requestToPort.set(pendingMsg.id as string, port);
      lobbyGroup.requestNames.set(
        pendingMsg.id as string,
        pendingMsg.name as string,
      );
      lobbyGroup.requestBudgetIds.set(pendingMsg.id as string, budgetId);
      lobbyGroup.leaderPort.postMessage({
        type: '__to-worker',
        msg: pendingMsg,
      });
      port.postMessage({
        type: '__role-change',
        role: 'LEADER',
        budgetId,
      });
      logState(`Lobby leader now on budget "${budgetId}"`);
    }
  }

  // ── Connection handler ────────────────────────────────────────────────

  function onconnect(e: { ports: CoordinatorPort[] }) {
    const port = e.ports[0];
    connectedPorts.push(port);
    unassignedPorts.add(port);
    logState('Tab connected');

    port.onmessage = function (event: { data: Record<string, unknown> }) {
      try {
        const msg = event.data;
        const portBudget = portToBudget.get(port);
        const group = portBudget ? budgetGroups.get(portBudget) : null;

        // ── Tab lifecycle ──────────────────────────────────────────

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

        // ── Initialization ─────────────────────────────────────────

        if (msg.type === 'init') {
          cachedInitMsg = msg;
          if (lastAppInitFailure) {
            port.postMessage(lastAppInitFailure);
          } else {
            let anyConnected = false;
            for (const [, g] of budgetGroups) {
              if (g.backendConnected) {
                anyConnected = true;
                break;
              }
            }
            if (anyConnected) {
              port.postMessage({ type: '__role-change', role: 'UNASSIGNED' });
              port.postMessage({ type: 'connect' });
            } else if (budgetGroups.size > 0) {
              port.postMessage({ type: '__role-change', role: 'UNASSIGNED' });
            } else {
              electLeader('__lobby', port);
            }
          }
          return;
        }

        // ── Leader tab forwarding Worker messages back ─────────────

        if (msg.type === '__from-worker') {
          if (!group || port !== group.leaderPort) return;
          const workerMsg = msg.msg as Record<string, unknown>;

          if (workerMsg.type === 'reply' || workerMsg.type === 'error') {
            const targetPort = group.requestToPort.get(workerMsg.id as string);
            if (targetPort) {
              targetPort.postMessage(workerMsg);

              const name = group.requestNames.get(workerMsg.id as string);
              if (workerMsg.type === 'reply' && name === 'load-budget') {
                const budgetId = group.requestBudgetIds.get(
                  workerMsg.id as string,
                );
                if (budgetId) {
                  group.requestBudgetIds.delete(workerMsg.id as string);
                  handleBudgetLoaded(port, portBudget!, budgetId);
                }
              }
              if (workerMsg.type === 'reply' && name === 'close-budget') {
                handleBudgetClosed(targetPort, portBudget!);
              }
              if (
                workerMsg.type === 'reply' &&
                name === 'load-prefs' &&
                portBudget &&
                portBudget.startsWith('__creating-') &&
                workerMsg.result &&
                (workerMsg.result as Record<string, unknown>).id
              ) {
                handleBudgetLoaded(
                  port,
                  portBudget,
                  (workerMsg.result as Record<string, unknown>).id as string,
                );
              }

              group.requestToPort.delete(workerMsg.id as string);
              group.requestNames.delete(workerMsg.id as string);
            }
          } else if (workerMsg.type === 'connect') {
            group.backendConnected = true;
            broadcastToAllInGroup(portBudget!, workerMsg);
            for (const p of unassignedPorts) {
              p.postMessage(workerMsg);
            }
          } else if (workerMsg.type === 'app-init-failure') {
            lastAppInitFailure = workerMsg;
            broadcastToAllInGroup(portBudget!, workerMsg);
          } else {
            broadcastToAllInGroup(portBudget!, workerMsg);
          }
          return;
        }

        // ── Leader tab registering a budget restore ────────────────

        if (msg.type === '__track-restore') {
          if (group) {
            group.requestToPort.set(msg.requestId as string, port);
            group.requestNames.set(msg.requestId as string, 'load-budget');
            group.requestBudgetIds.set(
              msg.requestId as string,
              msg.budgetId as string,
            );
          }
          return;
        }

        // ── Request interception & routing ─────────────────────────

        if (
          msg.name === 'load-budget' &&
          msg.args &&
          (msg.args as Record<string, unknown>).id
        ) {
          const budgetId = (msg.args as Record<string, unknown>).id as string;
          const existingGroup = budgetGroups.get(budgetId);

          if (existingGroup && existingGroup.backendConnected) {
            addFollower(budgetId, port);
            existingGroup.requestToPort.set(msg.id as string, port);
            existingGroup.requestNames.set(
              msg.id as string,
              msg.name as string,
            );
            existingGroup.requestBudgetIds.set(msg.id as string, budgetId);
            existingGroup.leaderPort.postMessage({
              type: '__to-worker',
              msg,
            });
            logState(`Tab joined budget "${budgetId}" as follower`);
            return;
          }

          if (existingGroup && !existingGroup.backendConnected) {
            addFollower(budgetId, port);
            existingGroup.requestToPort.set(msg.id as string, port);
            existingGroup.requestNames.set(
              msg.id as string,
              msg.name as string,
            );
            existingGroup.requestBudgetIds.set(msg.id as string, budgetId);
            existingGroup.leaderPort.postMessage({
              type: '__to-worker',
              msg,
            });
            logState(
              `Tab joined budget "${budgetId}" as follower (backend booting)`,
            );
            return;
          }

          if (portBudget === '__lobby') {
            migrateLobbyLeader(port, budgetId, msg);
          } else if (group && port === group.leaderPort) {
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
            group.requestToPort.set(msg.id as string, port);
            group.requestNames.set(msg.id as string, msg.name as string);
            group.requestBudgetIds.set(msg.id as string, budgetId);
            group.leaderPort.postMessage({ type: '__to-worker', msg });
          } else {
            electLeader(budgetId, port, null, msg);
            const newGroup = budgetGroups.get(budgetId);
            if (newGroup) {
              newGroup.requestToPort.set(msg.id as string, port);
              newGroup.requestNames.set(msg.id as string, msg.name as string);
              newGroup.requestBudgetIds.set(msg.id as string, budgetId);
            }
            logState(`Tab became leader for new budget "${budgetId}"`);
          }
          return;
        }

        // close-budget: handle leader vs follower
        if (msg.name === 'close-budget' && group) {
          if (port === group.leaderPort) {
            if (group.followers.size > 0) {
              const newLeader = group.followers.values().next()
                .value as CoordinatorPort;
              group.followers.delete(newLeader);
              console.log(
                `[SharedWorker] Leader closing budget "${portBudget}" but ${group.followers.size + 1} tab(s) remain — transferring`,
              );
              port.postMessage({
                type: '__close-and-transfer',
                requestId: msg.id,
              });
              electLeader(portBudget!, newLeader, portBudget);
              portToBudget.delete(port);
              unassignedPorts.add(port);
              logState(`Leadership transferred for "${portBudget}"`);
              return;
            }
            group.requestToPort.set(msg.id as string, port);
            group.requestNames.set(msg.id as string, msg.name as string);
            group.leaderPort.postMessage({ type: '__to-worker', msg });
            return;
          } else {
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
          const targetId = (msg.args as Record<string, unknown>).id as string;
          if (targetId && budgetGroups.has(targetId)) {
            evictGroup(targetId, port);
            logState(`Evicted group for deleted budget "${targetId}"`);
          }
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
              newGroup.requestToPort.set(msg.id as string, port);
              newGroup.requestNames.set(msg.id as string, msg.name as string);
            }
            logState(`Tab became leader for budget deletion ("${tempId}")`);
            return;
          }
        }

        // Budget-replacing operations
        if (
          msg.name === 'create-budget' ||
          msg.name === 'create-demo-budget' ||
          msg.name === 'import-budget' ||
          msg.name === 'duplicate-budget' ||
          msg.name === 'delete-budget'
        ) {
          if (msg.name === 'create-demo-budget') {
            evictGroup('_demo-budget', port);
          } else if (
            msg.name === 'create-budget' &&
            msg.args &&
            (msg.args as Record<string, unknown>).testMode
          ) {
            evictGroup('_test-budget', port);
          }
          if (group && port === group.leaderPort) {
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
          } else {
            if (group) {
              group.followers.delete(port);
              portToBudget.delete(port);
              unassignedPorts.add(port);
            }
            const tempId = '__creating-' + Date.now();
            electLeader(tempId, port, null, msg);
            const newGroup = budgetGroups.get(tempId);
            if (newGroup && msg.id) {
              newGroup.requestToPort.set(msg.id as string, port);
              newGroup.requestNames.set(msg.id as string, msg.name as string);
            }
            logState(`Tab became leader for budget creation ("${tempId}")`);
            return;
          }
        }

        // ── Default: track and forward to leader ───────────────────

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
            targetGroup.requestToPort.set(msg.id as string, port);
            if (msg.name) {
              targetGroup.requestNames.set(
                msg.id as string,
                msg.name as string,
              );
            }
            if (
              msg.name === 'load-budget' &&
              msg.args &&
              (msg.args as Record<string, unknown>).id
            ) {
              targetGroup.requestBudgetIds.set(
                msg.id as string,
                (msg.args as Record<string, unknown>).id as string,
              );
            }
          }
          targetGroup.leaderPort.postMessage({ type: '__to-worker', msg });
        }
      } catch (error) {
        console.error('[SharedWorker] Error in message handler:', error);
      }
    };

    port.start();
  }

  // ── Public API ────────────────────────────────────────────────────────

  function destroy() {
    clearInterval(heartbeatId);
  }

  function getState() {
    return {
      connectedPorts,
      cachedInitMsg,
      lastAppInitFailure,
      budgetGroups,
      portToBudget,
      unassignedPorts,
    };
  }

  return { onconnect, destroy, getState };
}
