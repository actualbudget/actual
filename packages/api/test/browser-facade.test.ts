import { afterEach, describe, expect, test, vi } from 'vitest';

import * as api from '../index.browser';

// Swap the real Worker constructor for a mock that the tests control. Vitest
// picks this up via vite.config resolve.alias; here we just stand in globally
// because jsdom does not ship Worker at all.
class MockWorker {
  public posted: Array<unknown> = [];
  public responder: (
    req: { id: string; name: string; args?: unknown },
    reply: (res: unknown) => void,
  ) => void = () => undefined;

  private listeners: Array<(e: MessageEvent) => void> = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  private connected = false;

  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    if (type === 'message') this.listeners.push(handler);
  }

  removeEventListener() {
    // no-op for tests
  }

  postMessage(msg: unknown) {
    this.posted.push(msg);

    if (
      msg &&
      typeof msg === 'object' &&
      (msg as { name?: string }).name === 'client-connected-to-backend'
    ) {
      // Handshake complete; we won't keep sending 'connect' heartbeats.
      return;
    }

    const req = msg as { id: string; name: string; args?: unknown };
    queueMicrotask(() => {
      this.responder(req, (data: unknown) => {
        const ev = { data } as MessageEvent;
        this.onmessage?.(ev);
        for (const l of this.listeners) l(ev);
      });
    });
  }

  /** Simulate loot-core's connect handshake from the worker side. */
  fireConnect() {
    if (this.connected) return;
    this.connected = true;
    const ev = { data: { type: 'connect' } } as MessageEvent;
    this.onmessage?.(ev);
    for (const l of this.listeners) l(ev);
  }

  terminate() {
    this.listeners = [];
  }
}

// Every Worker the api spawns inside init() comes through here.
let lastMockWorker: MockWorker | null = null;
const mockWorkerResponder = vi.fn<
  (
    req: { id: string; name: string; args?: unknown },
    reply: (res: unknown) => void,
  ) => void
>(() => undefined);

// Global Worker stub — the api's internal `new Worker(...)` will call this.
// @ts-expect-error jsdom has no Worker; we override the global for the test.
globalThis.Worker = class {
  constructor(_url: URL | string, _opts?: WorkerOptions) {
    const w = new MockWorker();
    w.responder = (req, reply) => mockWorkerResponder(req, reply);
    lastMockWorker = w;
    // Fire the connect handshake on the next tick so init() resolves.
    queueMicrotask(() => w.fireConnect());
    return w as unknown as Worker;
  }
};

// absurd-sql's main-thread bridge expects real Worker event semantics. The
// mock above exposes addEventListener; initSQLBackend just attaches a
// message listener, so it's safe with jsdom.

afterEach(async () => {
  // Keep whatever responder the test installed so shutdown's sync/close-budget
  // calls resolve rather than hang.
  await api.shutdown().catch(() => undefined);
  mockWorkerResponder.mockReset();
  lastMockWorker = null;
});

describe('@actual-app/api browser facade', () => {
  test('spawns a worker on init and forwards config via api-browser/init', async () => {
    mockWorkerResponder.mockImplementation((req, reply) => {
      reply({ type: 'reply', id: req.id, result: undefined });
    });

    await api.init({
      dataDir: '/documents',
      serverURL: 'https://example.test',
      password: 'pw',
    });

    expect(lastMockWorker).toBeTruthy();
    // First post after the handshake ack is the api-browser/init request.
    const initCall = lastMockWorker!.posted.find(
      m =>
        m &&
        typeof m === 'object' &&
        (m as { name?: string }).name === 'api-browser/init',
    ) as { name: string; args: unknown } | undefined;
    expect(initCall).toBeTruthy();
    expect(initCall!.args).toMatchObject({
      dataDir: '/documents',
      serverURL: 'https://example.test',
      password: 'pw',
    });
    // The api also hands over its own asset base URL so loot-core's fs
    // can fetch migrations / default-db / WASM from the api's dist/
    // instead of the consumer's page origin.
    expect(
      (initCall!.args as { __assetsBaseUrl?: string }).__assetsBaseUrl,
    ).toBeTypeOf('string');
  });

  test('rpc methods forward as {id, name, args} and read {type:reply, result}', async () => {
    mockWorkerResponder.mockImplementation((req, reply) => {
      if (req.name === 'api-browser/init') {
        reply({ type: 'reply', id: req.id, result: undefined });
        return;
      }
      if (req.name === 'api/accounts-get') {
        reply({
          type: 'reply',
          id: req.id,
          result: [{ id: 'a1', name: 'Checking' }],
        });
        return;
      }
      reply({
        type: 'error',
        id: req.id,
        error: { type: 'APIError', message: 'unexpected' },
      });
    });

    await api.init({ dataDir: '/documents' });
    const accounts = await api.getAccounts();
    expect(accounts).toEqual([{ id: 'a1', name: 'Checking' }]);

    const sendCalls = lastMockWorker!.posted.filter(
      m =>
        m &&
        typeof m === 'object' &&
        (m as { name?: string }).name === 'api/accounts-get',
    );
    expect(sendCalls).toHaveLength(1);
    expect((sendCalls[0] as { args?: unknown }).args).toBeUndefined();
  });

  test('worker errors reject at the call site', async () => {
    mockWorkerResponder.mockImplementation((req, reply) => {
      if (req.name === 'api-browser/init') {
        reply({ type: 'reply', id: req.id, result: undefined });
        return;
      }
      reply({
        type: 'reply',
        id: req.id,
        error: { type: 'APIError', message: 'budget not loaded' },
      });
    });

    await api.init({ dataDir: '/documents' });
    await expect(api.getAccounts()).rejects.toThrow(/budget not loaded/);
  });
});
