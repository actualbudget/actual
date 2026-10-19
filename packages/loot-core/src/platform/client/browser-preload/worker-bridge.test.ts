import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { releaseStorageThenTerminate, WorkerBridge } from './worker-bridge';
import type { TerminatableWorker } from './worker-bridge';

type FakeWorker = TerminatableWorker & {
  posted: unknown[];
  reply: (message: unknown) => void;
};

function fakeWorker(): FakeWorker {
  const listeners: Array<(event: MessageEvent) => void> = [];
  const worker: FakeWorker = {
    onmessage: () => {
      // Replaced by the bridge before the worker is released
    },
    posted: [],
    postMessage: message => worker.posted.push(message),
    addEventListener: (_type, handler) => listeners.push(handler),
    terminate: vi.fn<() => void>(),
    reply: message => {
      for (const listener of listeners) {
        listener({ data: message } as MessageEvent);
      }
    },
  };
  return worker;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('releaseStorageThenTerminate', () => {
  it('asks the backend to release its storage and terminates on the reply', () => {
    const worker = fakeWorker();
    releaseStorageThenTerminate(worker, 300);

    expect(worker.onmessage).toBeNull();
    expect(worker.posted).toEqual([
      expect.objectContaining({ name: 'storage-release' }),
    ]);
    expect(worker.terminate).not.toHaveBeenCalled();

    const request = worker.posted[0] as { id: string };
    worker.reply({ type: 'reply', id: request.id, result: 'ok' });
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    // The timeout must not terminate a second time
    vi.advanceTimersByTime(1000);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('terminates anyway when the backend does not answer in time', () => {
    const worker = fakeWorker();
    releaseStorageThenTerminate(worker, 300);

    vi.advanceTimersByTime(299);
    expect(worker.terminate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    // A late reply changes nothing
    const request = worker.posted[0] as { id: string };
    worker.reply({ type: 'reply', id: request.id, result: 'ok' });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated messages while waiting', () => {
    const worker = fakeWorker();
    releaseStorageThenTerminate(worker, 300);
    worker.reply({ type: 'push', name: 'sync-event' });
    worker.reply({ type: 'reply', id: 'something-else' });
    expect(worker.terminate).not.toHaveBeenCalled();
  });
});

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
      // The release step listens here; nothing to record
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
