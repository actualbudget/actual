import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkerBridge } from './worker-bridge';

describe('WorkerBridge takeover', () => {
  class FakeBackendWorker {
    static created: FakeBackendWorker[] = [];
    posted: unknown[] = [];
    onmessage: ((event: MessageEvent) => void) | null = null;
    constructor() {
      FakeBackendWorker.created.push(this);
    }
    postMessage(message: unknown) {
      this.posted.push(message);
    }
    addEventListener() {
      // absurd-sql's main-thread helper listens here; nothing to do
    }
    terminate() {
      // Nothing to release in the fake
    }
  }

  function createBridge() {
    FakeBackendWorker.created = [];
    vi.stubGlobal('Worker', FakeBackendWorker);
    const sharedPort = {
      postMessage: vi.fn(),
      start: vi.fn(),
      addEventListener: vi.fn(),
    };
    const bridge = new WorkerBridge(
      sharedPort as unknown as MessagePort,
      new URL('http://localhost/worker.js'),
    );
    const onSharedMessage = sharedPort.addEventListener.mock.calls[0][1] as (
      event: MessageEvent,
    ) => void;
    const fromCoordinator = (data: unknown) =>
      onSharedMessage({ data } as MessageEvent);
    return { bridge, sharedPort, fromCoordinator };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('holds forwarded requests until the restored budget is open', () => {
    const { fromCoordinator } = createBridge();
    fromCoordinator({
      type: '__become-leader',
      initMsg: { type: 'init' },
      budgetToRestore: 'budget-1',
      pendingMsg: null,
    });
    const worker = FakeBackendWorker.created[0];
    expect(worker.posted).toEqual([{ type: 'init' }]);

    // A follower's request arrives before the backend has even connected
    fromCoordinator({ type: '__to-worker', msg: { id: 'q1', name: 'query' } });
    expect(worker.posted).toHaveLength(1);

    worker.onmessage?.({ data: { type: 'connect' } } as MessageEvent);
    expect(worker.posted[1]).toEqual(
      expect.objectContaining({ id: '__restore-budget', name: 'load-budget' }),
    );
    expect(worker.posted).toHaveLength(2);

    worker.onmessage?.({
      data: { type: 'reply', id: '__restore-budget', result: {} },
    } as MessageEvent);
    expect(worker.posted[2]).toEqual({ id: 'q1', name: 'query' });

    // Later requests go straight through
    fromCoordinator({ type: '__to-worker', msg: { id: 'q2', name: 'query' } });
    expect(worker.posted[3]).toEqual({ id: 'q2', name: 'query' });
  });

  it('forwards requests at once when there is nothing to restore', () => {
    const { fromCoordinator } = createBridge();
    fromCoordinator({
      type: '__become-leader',
      initMsg: { type: 'init' },
      budgetToRestore: null,
      pendingMsg: null,
    });
    const worker = FakeBackendWorker.created[0];
    fromCoordinator({ type: '__to-worker', msg: { id: 'q1', name: 'query' } });
    expect(worker.posted).toEqual([
      { type: 'init' },
      { id: 'q1', name: 'query' },
    ]);
  });
});
