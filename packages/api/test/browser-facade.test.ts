import { afterEach, describe, expect, test } from 'vitest';

import * as api from '../index.browser';

// A hand-rolled Worker stand-in: captures postMessage payloads and lets the
// test script responses. jsdom doesn't ship a Worker implementation, and
// absurd-sql requires a real Worker anyway — the facade is what we test here.
class MockWorker {
  public posted: Array<{ id: number; op: string; payload?: unknown }> = [];
  public responder: (
    req: { id: number; op: string; payload?: unknown },
    reply: (res: unknown) => void,
  ) => void = () => undefined;

  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;

  postMessage(msg: { id: number; op: string; payload?: unknown }) {
    this.posted.push(msg);
    queueMicrotask(() => {
      const reply = (data: unknown) => {
        this.onmessage?.({ data } as MessageEvent);
      };
      this.responder(msg, reply);
    });
  }

  terminate() {
    // no-op
  }
}

function makeMockWorker(responder: MockWorker['responder']): MockWorker {
  const w = new MockWorker();
  w.responder = responder;
  return w;
}

afterEach(async () => {
  await api.shutdown().catch(() => undefined);
});

describe('@actual-app/api browser facade', () => {
  test('init requires a Worker', async () => {
    // @ts-expect-error exercising the validation path
    await expect(api.init({ dataDir: '/documents' })).rejects.toThrow(
      /requires a Worker/,
    );
  });

  test('forwards init to the worker with config stripped of worker', async () => {
    const worker = makeMockWorker((req, reply) => {
      reply({ id: req.id, result: undefined });
    });

    await api.init({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      worker: worker as unknown as any,
      dataDir: '/documents',
      serverURL: 'https://example.test',
      password: 'pw',
    });

    const initCall = worker.posted.find(m => m.op === 'init');
    expect(initCall).toBeTruthy();
    const payload = initCall!.payload as { config: Record<string, unknown> };
    expect(payload.config).toEqual({
      dataDir: '/documents',
      serverURL: 'https://example.test',
      password: 'pw',
    });
    // Worker itself must not round-trip through postMessage.
    expect(payload.config).not.toHaveProperty('worker');
  });

  test('rpc methods forward as send(name, args)', async () => {
    const worker = makeMockWorker((req, reply) => {
      if (req.op === 'init') return reply({ id: req.id, result: undefined });
      if (req.op === 'send') {
        const p = req.payload as { name: string };
        if (p.name === 'api/accounts-get') {
          return reply({
            id: req.id,
            result: [{ id: 'a1', name: 'Checking' }],
          });
        }
      }
      reply({ id: req.id, error: { name: 'Error', message: 'unexpected' } });
    });

    await api.init({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      worker: worker as unknown as any,
      dataDir: '/documents',
    });
    const accounts = await api.getAccounts();
    expect(accounts).toEqual([{ id: 'a1', name: 'Checking' }]);

    const sendCalls = worker.posted.filter(m => m.op === 'send');
    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0].payload).toEqual({
      name: 'api/accounts-get',
      args: undefined,
    });
  });

  test('worker errors reject at the call site', async () => {
    const worker = makeMockWorker((req, reply) => {
      if (req.op === 'init') return reply({ id: req.id, result: undefined });
      reply({
        id: req.id,
        error: { name: 'BudgetError', message: 'budget not loaded' },
      });
    });

    await api.init({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      worker: worker as unknown as any,
      dataDir: '/documents',
    });

    await expect(api.getAccounts()).rejects.toThrow(/budget not loaded/);
  });
});
