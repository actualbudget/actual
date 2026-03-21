import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { createCoordinator } from './shared-browser-server-core';

// ── Types ───────────────────────────────────────────────────────────────

type MockPort = {
  postMessage: Mock;
  start: Mock;
  onmessage: ((event: { data: unknown }) => void) | null;
};

type Coordinator = ReturnType<typeof createCoordinator>;

// ── Test helpers ────────────────────────────────────────────────────────

function createMockPort(): MockPort {
  return { postMessage: vi.fn(), start: vi.fn(), onmessage: null };
}

function setup(): Coordinator {
  return createCoordinator();
}

/** Simulate a new tab connecting to the SharedWorker. */
function connectTab(coordinator: Coordinator): MockPort {
  const port = createMockPort();
  coordinator.onconnect({ ports: [port] });
  return port;
}

/** Send a message on behalf of a port (as if the tab sent it). */
function sendMsg(port: MockPort, msg: Record<string, unknown>): void {
  port.onmessage!({ data: msg });
}

/** Send the standard init message from a tab. */
function sendInit(port: MockPort): void {
  sendMsg(port, { type: 'init', version: '1.0', isDev: false });
}

/**
 * Simulate the leader's Worker reporting that the backend is connected.
 * In the real flow the Worker sends a 'connect' message → the bridge
 * wraps it in __from-worker → the SharedWorker broadcasts it.
 */
function simulateWorkerConnect(leaderPort: MockPort): void {
  sendMsg(leaderPort, {
    type: '__from-worker',
    msg: { type: 'connect' },
  });
}

/**
 * Set up a fully running budget group with one leader tab.
 * Returns the leader port.
 */
function setupBudgetGroup(
  coordinator: Coordinator,
  budgetId: string,
): MockPort {
  const leader = connectTab(coordinator);
  sendInit(leader);
  leader.postMessage.mockClear();

  // Lobby leader → load budget → migrates lobby to real budget
  sendMsg(leader, {
    id: 'lb-1',
    name: 'load-budget',
    args: { id: budgetId },
  });

  // Simulate the Worker reporting connect
  simulateWorkerConnect(leader);

  // Simulate successful load-budget reply
  sendMsg(leader, {
    type: '__from-worker',
    msg: { type: 'reply', id: 'lb-1', result: {} },
  });

  leader.postMessage.mockClear();
  return leader;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('SharedWorker coordinator', () => {
  let coordinator: Coordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    coordinator = setup();
  });

  afterEach(() => {
    coordinator.destroy();
    vi.useRealTimers();
  });

  // ── Initialization ──────────────────────────────────────────────────

  describe('initialization', () => {
    it('first tab is elected as lobby leader', () => {
      const port = connectTab(coordinator);
      sendInit(port);

      expect(port.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__role-change',
          role: 'LEADER',
          budgetId: '__lobby',
        }),
      );
    });

    it('second tab with no connected backend gets UNASSIGNED role', () => {
      const port1 = connectTab(coordinator);
      sendInit(port1);

      const port2 = connectTab(coordinator);
      sendInit(port2);

      // Second tab should be UNASSIGNED (backend is booting, not connected)
      expect(port2.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__role-change',
          role: 'UNASSIGNED',
        }),
      );
    });

    it('second tab gets connect message when backend is already running', () => {
      setupBudgetGroup(coordinator, 'budget-1');

      const port2 = connectTab(coordinator);
      sendInit(port2);

      expect(port2.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: '__role-change', role: 'UNASSIGNED' }),
      );
      expect(port2.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'connect' }),
      );
    });

    it('caches init message for new leaders', () => {
      const port1 = connectTab(coordinator);
      const initMsg = { type: 'init', version: '2.0', isDev: true };
      sendMsg(port1, initMsg);

      expect(coordinator.getState().cachedInitMsg).toEqual(initMsg);
    });

    it('sends cached init failure to late-joining tabs', () => {
      // Set up a leader whose Worker reports init failure
      const leader = connectTab(coordinator);
      sendInit(leader);
      simulateWorkerConnect(leader);

      sendMsg(leader, {
        type: '__from-worker',
        msg: { type: 'app-init-failure', error: 'boom' },
      });

      const port2 = connectTab(coordinator);
      sendInit(port2);

      expect(port2.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'app-init-failure', error: 'boom' }),
      );
    });
  });

  // ── Load budget ─────────────────────────────────────────────────────

  describe('load-budget', () => {
    it('lobby leader migrates to real budget group on load-budget', () => {
      const leader = connectTab(coordinator);
      sendInit(leader);
      leader.postMessage.mockClear();

      sendMsg(leader, {
        id: 'lb-1',
        name: 'load-budget',
        args: { id: 'my-budget' },
      });

      const state = coordinator.getState();
      expect(state.budgetGroups.has('__lobby')).toBe(false);
      expect(state.budgetGroups.has('my-budget')).toBe(true);
      expect(state.portToBudget.get(leader)).toBe('my-budget');

      // Should have forwarded load-budget to the Worker
      expect(leader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__to-worker',
          msg: expect.objectContaining({ name: 'load-budget' }),
        }),
      );
    });

    it('second tab joins existing budget as follower', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      const follower = connectTab(coordinator);
      sendInit(follower);
      follower.postMessage.mockClear();

      sendMsg(follower, {
        id: 'lb-2',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });

      expect(follower.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__role-change',
          role: 'FOLLOWER',
          budgetId: 'budget-1',
        }),
      );

      // Should also get connect since backend is already running
      expect(follower.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'connect' }),
      );

      const group = coordinator.getState().budgetGroups.get('budget-1');
      expect(group.followers.has(follower)).toBe(true);
    });

    it('new tab on unloaded budget becomes leader for that budget', () => {
      // Set up budget-1 so the lobby is consumed
      setupBudgetGroup(coordinator, 'budget-1');

      const tab2 = connectTab(coordinator);
      sendInit(tab2);
      tab2.postMessage.mockClear();

      sendMsg(tab2, {
        id: 'lb-3',
        name: 'load-budget',
        args: { id: 'budget-2' },
      });

      expect(tab2.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__role-change',
          role: 'LEADER',
          budgetId: 'budget-2',
        }),
      );

      const state = coordinator.getState();
      expect(state.budgetGroups.has('budget-2')).toBe(true);
      expect(state.budgetGroups.get('budget-2').leaderPort).toBe(tab2);
    });

    it('leader switching budgets pushes followers off old budget', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      // Add a follower
      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });
      follower.postMessage.mockClear();

      // Leader loads a different budget
      sendMsg(leader, {
        id: 'lb-switch',
        name: 'load-budget',
        args: { id: 'budget-2' },
      });

      // Follower should be pushed to show-budgets
      expect(follower.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'push', name: 'show-budgets' }),
      );
    });
  });

  // ── Close budget ────────────────────────────────────────────────────

  describe('close-budget', () => {
    it('follower gets synthetic reply and leaves group', () => {
      setupBudgetGroup(coordinator, 'budget-1');

      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });
      follower.postMessage.mockClear();

      sendMsg(follower, { id: 'cb-1', name: 'close-budget' });

      expect(follower.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'reply', id: 'cb-1', data: {} }),
      );

      const group = coordinator.getState().budgetGroups.get('budget-1');
      expect(group.followers.has(follower)).toBe(false);
      expect(coordinator.getState().unassignedPorts.has(follower)).toBe(true);
    });

    it('leader with followers transfers leadership', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });
      follower.postMessage.mockClear();
      leader.postMessage.mockClear();

      sendMsg(leader, { id: 'cb-leader', name: 'close-budget' });

      // Leader should get __close-and-transfer
      expect(leader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__close-and-transfer',
          requestId: 'cb-leader',
        }),
      );

      // Follower should be promoted to leader
      expect(follower.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__role-change',
          role: 'LEADER',
          budgetId: 'budget-1',
        }),
      );

      const group = coordinator.getState().budgetGroups.get('budget-1');
      expect(group.leaderPort).toBe(follower);
    });

    it('leader with no followers forwards close to Worker', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');
      leader.postMessage.mockClear();

      sendMsg(leader, { id: 'cb-solo', name: 'close-budget' });

      expect(leader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__to-worker',
          msg: expect.objectContaining({ name: 'close-budget' }),
        }),
      );
    });

    it('close-budget reply from Worker cleans up group', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      sendMsg(leader, { id: 'cb-solo', name: 'close-budget' });

      // Simulate Worker reply
      sendMsg(leader, {
        type: '__from-worker',
        msg: { type: 'reply', id: 'cb-solo', result: {} },
      });

      expect(coordinator.getState().budgetGroups.has('budget-1')).toBe(false);
    });
  });

  // ── Tab disconnection & failover ────────────────────────────────────

  describe('tab disconnection', () => {
    it('leader disconnect promotes follower', () => {
      setupBudgetGroup(coordinator, 'budget-1');

      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });
      follower.postMessage.mockClear();

      // Find current leader to disconnect it
      const group = coordinator.getState().budgetGroups.get('budget-1');
      const leader = group.leaderPort as MockPort;

      // Leader closes tab
      sendMsg(leader, { type: 'tab-closing' });

      // Follower should be promoted
      expect(follower.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__role-change',
          role: 'LEADER',
          budgetId: 'budget-1',
        }),
      );

      const updatedGroup = coordinator.getState().budgetGroups.get('budget-1');
      expect(updatedGroup.leaderPort).toBe(follower);
    });

    it('last tab leaving removes budget group', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      sendMsg(leader, { type: 'tab-closing' });

      expect(coordinator.getState().budgetGroups.has('budget-1')).toBe(false);
    });

    it('follower disconnect cleans up group membership', () => {
      setupBudgetGroup(coordinator, 'budget-1');

      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });

      const group = coordinator.getState().budgetGroups.get('budget-1');
      expect(group.followers.has(follower)).toBe(true);

      sendMsg(follower, { type: 'tab-closing' });

      expect(group.followers.has(follower)).toBe(false);
    });
  });

  // ── Heartbeat ───────────────────────────────────────────────────────

  describe('heartbeat', () => {
    it('sends heartbeat pings to all connected ports', () => {
      const port1 = connectTab(coordinator);
      sendInit(port1);
      port1.postMessage.mockClear();

      vi.advanceTimersByTime(10_000);

      expect(port1.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: '__heartbeat-ping' }),
      );
    });

    it('removes ports that do not respond to heartbeat', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      // First heartbeat — marks port as pending
      vi.advanceTimersByTime(10_000);
      // Second heartbeat — port didn't respond, gets removed
      vi.advanceTimersByTime(10_000);

      expect(coordinator.getState().connectedPorts.includes(leader)).toBe(
        false,
      );
    });

    it('keeps ports that respond with pong', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      // First heartbeat
      vi.advanceTimersByTime(10_000);
      // Respond with pong
      sendMsg(leader, { type: '__heartbeat-pong' });
      // Second heartbeat — should NOT remove the port
      vi.advanceTimersByTime(10_000);

      expect(coordinator.getState().connectedPorts.includes(leader)).toBe(true);
    });
  });

  // ── Worker message routing ──────────────────────────────────────────

  describe('Worker message routing', () => {
    it('routes reply to the port that sent the request', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });

      // Follower sends a request
      follower.postMessage.mockClear();
      sendMsg(follower, { id: 'req-1', name: 'get-budgets' });

      // Worker replies
      sendMsg(leader, {
        type: '__from-worker',
        msg: { type: 'reply', id: 'req-1', result: ['b1'] },
      });

      expect(follower.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reply',
          id: 'req-1',
          result: ['b1'],
        }),
      );
    });

    it('broadcasts connect to entire group and unassigned ports', () => {
      const leader = connectTab(coordinator);
      sendInit(leader);

      // Load budget (still in lobby migration)
      sendMsg(leader, {
        id: 'lb-1',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });

      const unassigned = connectTab(coordinator);
      sendInit(unassigned);
      unassigned.postMessage.mockClear();

      // Worker reports connected
      simulateWorkerConnect(leader);

      expect(unassigned.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'connect' }),
      );
    });

    it('forwards fire-and-forget messages (no id) to Worker', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });
      leader.postMessage.mockClear();

      // Fire-and-forget message (no id)
      sendMsg(follower, { type: 'client-connected-to-backend' });

      expect(leader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__to-worker',
          msg: expect.objectContaining({
            type: 'client-connected-to-backend',
          }),
        }),
      );
    });

    it('unassigned ports route to any connected group', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      const unassigned = connectTab(coordinator);
      sendInit(unassigned);
      leader.postMessage.mockClear();

      sendMsg(unassigned, { id: 'req-u', name: 'get-budgets' });

      expect(leader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__to-worker',
          msg: expect.objectContaining({ name: 'get-budgets' }),
        }),
      );
    });
  });

  // ── Budget-replacing operations ─────────────────────────────────────

  describe('budget-replacing operations', () => {
    it.each(['create-budget', 'import-budget', 'duplicate-budget'])(
      '%s from follower gets own temporary Worker',
      (opName: string) => {
        setupBudgetGroup(coordinator, 'budget-1');

        const follower = connectTab(coordinator);
        sendInit(follower);
        sendMsg(follower, {
          id: 'lb-f',
          name: 'load-budget',
          args: { id: 'budget-1' },
        });
        follower.postMessage.mockClear();

        sendMsg(follower, { id: 'op-1', name: opName });

        // Follower should be elected as leader for a temp group
        expect(follower.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: '__role-change',
            role: 'LEADER',
          }),
        );

        // The temp group should exist
        const state = coordinator.getState();
        const tempBudget = state.portToBudget.get(follower);
        expect(tempBudget).toMatch(/^__creating-/);
      },
    );

    it('create-budget from leader pushes followers off', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });
      follower.postMessage.mockClear();

      sendMsg(leader, { id: 'cb-1', name: 'create-budget' });

      expect(follower.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'push', name: 'show-budgets' }),
      );

      const group = coordinator.getState().budgetGroups.get('budget-1');
      expect(group.followers.size).toBe(0);
    });

    it('create-demo-budget evicts existing _demo-budget group', () => {
      const demoLeader = setupBudgetGroup(coordinator, '_demo-budget');

      const tab2 = connectTab(coordinator);
      sendInit(tab2);
      tab2.postMessage.mockClear();

      sendMsg(tab2, { id: 'cdb-1', name: 'create-demo-budget' });

      // Old demo leader should have been evicted
      expect(demoLeader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__close-and-transfer',
          requestId: null,
        }),
      );
      expect(demoLeader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'push', name: 'show-budgets' }),
      );

      expect(coordinator.getState().budgetGroups.has('_demo-budget')).toBe(
        false,
      );
    });

    it('create-budget with testMode evicts existing _test-budget group', () => {
      const testLeader = setupBudgetGroup(coordinator, '_test-budget');

      const tab2 = connectTab(coordinator);
      sendInit(tab2);
      tab2.postMessage.mockClear();

      sendMsg(tab2, {
        id: 'ctb-1',
        name: 'create-budget',
        args: { testMode: true },
      });

      expect(testLeader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__close-and-transfer',
          requestId: null,
        }),
      );
    });

    it('load-prefs reply renames __creating- temp group to real budget ID', () => {
      setupBudgetGroup(coordinator, 'budget-1');

      const creator = connectTab(coordinator);
      sendInit(creator);
      sendMsg(creator, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });

      // Creator sends create-budget → gets temp Worker
      sendMsg(creator, { id: 'cb-1', name: 'create-budget' });

      const tempId = coordinator.getState().portToBudget.get(creator);
      expect(tempId).toMatch(/^__creating-/);

      // Simulate backend connect for the temp group
      simulateWorkerConnect(creator);

      // Track a load-prefs request
      sendMsg(creator, { id: 'lp-1', name: 'load-prefs' });

      // Worker replies with load-prefs containing the new budget ID
      sendMsg(creator, {
        type: '__from-worker',
        msg: { type: 'reply', id: 'lp-1', result: { id: 'new-budget-123' } },
      });

      const state = coordinator.getState();
      expect(state.budgetGroups.has(tempId)).toBe(false);
      expect(state.budgetGroups.has('new-budget-123')).toBe(true);
      expect(state.portToBudget.get(creator)).toBe('new-budget-123');
    });
  });

  // ── Delete budget ───────────────────────────────────────────────────

  describe('delete-budget', () => {
    it('evicts the group running the deleted budget', () => {
      const leader1 = setupBudgetGroup(coordinator, 'budget-1');
      const leader2 = setupBudgetGroup(coordinator, 'budget-2');

      leader1.postMessage.mockClear();

      // Tab on budget-2 deletes budget-1
      sendMsg(leader2, {
        id: 'db-1',
        name: 'delete-budget',
        args: { id: 'budget-1' },
      });

      // budget-1 leader should be evicted
      expect(leader1.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__close-and-transfer',
          requestId: null,
        }),
      );
      expect(coordinator.getState().budgetGroups.has('budget-1')).toBe(false);
    });

    it('spins up temp Worker when no connected group remains after eviction', () => {
      setupBudgetGroup(coordinator, 'budget-1');

      // A new unassigned tab tries to delete budget-1
      const deleter = connectTab(coordinator);
      sendInit(deleter);
      deleter.postMessage.mockClear();

      sendMsg(deleter, {
        id: 'db-1',
        name: 'delete-budget',
        args: { id: 'budget-1' },
      });

      // After evicting budget-1, no connected group remains
      // → deleter should get a temp Worker
      const tempId = coordinator.getState().portToBudget.get(deleter);
      expect(tempId).toMatch(/^__deleting-/);

      expect(deleter.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '__role-change',
          role: 'LEADER',
        }),
      );
    });
  });

  // ── Track restore ───────────────────────────────────────────────────

  describe('__track-restore', () => {
    it('registers a budget restore for reply routing', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      sendMsg(leader, {
        type: '__track-restore',
        requestId: 'restore-1',
        budgetId: 'budget-1',
      });

      const group = coordinator.getState().budgetGroups.get('budget-1');
      expect(group.requestToPort.get('restore-1')).toBe(leader);
      expect(group.requestNames.get('restore-1')).toBe('load-budget');
      expect(group.requestBudgetIds.get('restore-1')).toBe('budget-1');
    });
  });

  // ── Multiple budgets ────────────────────────────────────────────────

  describe('multiple budgets', () => {
    it('supports multiple independent budget groups', () => {
      const leader1 = setupBudgetGroup(coordinator, 'budget-1');
      const leader2 = setupBudgetGroup(coordinator, 'budget-2');

      const state = coordinator.getState();
      expect(state.budgetGroups.size).toBe(2);
      expect(state.budgetGroups.get('budget-1').leaderPort).toBe(leader1);
      expect(state.budgetGroups.get('budget-2').leaderPort).toBe(leader2);
    });

    it('requests from one group do not leak into another', () => {
      const leader1 = setupBudgetGroup(coordinator, 'budget-1');
      const leader2 = setupBudgetGroup(coordinator, 'budget-2');

      // Follower joins budget-1
      const follower = connectTab(coordinator);
      sendInit(follower);
      sendMsg(follower, {
        id: 'lb-f',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });

      follower.postMessage.mockClear();
      leader2.postMessage.mockClear();

      // Follower sends request — should go to budget-1's leader only
      sendMsg(follower, { id: 'req-1', name: 'some-action' });

      expect(leader1.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: '__to-worker' }),
      );
      // leader2 should NOT have received this
      expect(leader2.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: '__to-worker' }),
      );
    });
  });

  // ── Eviction ────────────────────────────────────────────────────────

  describe('evictGroup', () => {
    it('evicts followers and leader, sending them to show-budgets', () => {
      const leader = setupBudgetGroup(coordinator, 'budget-1');

      const f1 = connectTab(coordinator);
      sendInit(f1);
      sendMsg(f1, {
        id: 'lb-f1',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });

      const f2 = connectTab(coordinator);
      sendInit(f2);
      sendMsg(f2, {
        id: 'lb-f2',
        name: 'load-budget',
        args: { id: 'budget-1' },
      });

      f1.postMessage.mockClear();
      f2.postMessage.mockClear();
      leader.postMessage.mockClear();

      // Another tab triggers deletion of budget-1
      const deleter = connectTab(coordinator);
      sendInit(deleter);
      // Set up a second budget so the deleter has a Worker
      sendMsg(deleter, {
        id: 'lb-del',
        name: 'load-budget',
        args: { id: 'budget-other' },
      });
      simulateWorkerConnect(deleter);
      sendMsg(deleter, {
        type: '__from-worker',
        msg: { type: 'reply', id: 'lb-del', result: {} },
      });

      sendMsg(deleter, {
        id: 'db-1',
        name: 'delete-budget',
        args: { id: 'budget-1' },
      });

      // All budget-1 tabs should be pushed to show-budgets
      expect(f1.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'push', name: 'show-budgets' }),
      );
      expect(f2.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'push', name: 'show-budgets' }),
      );
      expect(leader.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'push', name: 'show-budgets' }),
      );

      expect(coordinator.getState().budgetGroups.has('budget-1')).toBe(false);
    });
  });
});
