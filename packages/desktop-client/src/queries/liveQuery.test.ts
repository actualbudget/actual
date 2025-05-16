// @ts-strict-ignore
import * as fetch from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { resetTracer, tracer } from 'loot-core/shared/test-helpers';

import { liveQuery } from './liveQuery';

function wait(n) {
  return new Promise(resolve => setTimeout(() => resolve(`wait(${n})`), n));
}

function isCountQuery(query) {
  if (query.selectExpressions.length === 1) {
    const select = query.selectExpressions[0];
    return select.result && select.result.$count === '*';
  }

  return false;
}

const eventListeners = new Map();

function clearEventListeners() {
  eventListeners.clear();
}

function mockListen(name, listener): () => void {
  if (!eventListeners.get(name)) {
    eventListeners.set(name, []);
  }
  eventListeners.get(name).push(listener);

  return () => {
    const arr = eventListeners.get(name);
    eventListeners.set(
      name,
      arr.filter(l => l !== listener),
    );
  };
}

function mockPublishEvent(name, args) {
  const listeners = eventListeners.get(name);
  if (listeners) {
    listeners.forEach(listener => listener(args));
  }
}

async function mockSend(name, args, { delay }) {
  switch (name) {
    case 'query':
      const query = args;
      if (!isCountQuery(query)) {
        tracer.event('server-query');
      }
      if (delay) {
        await wait(delay);
      }
      return { data: query.selectExpressions, dependencies: ['transactions'] };
    default:
      throw new Error(`Command not implemented: ${name}`);
  }
}

function mockServer({ send = mockSend, listen = mockListen }) {
  vi.spyOn(fetch, 'send').mockImplementation((name, args) => {
    return send(name, args, { delay: 0 });
  });
  vi.spyOn(fetch, 'listen').mockImplementation(listen);
}

function clearMockServer() {
  clearEventListeners();
  vi.clearAllMocks();
}

function mockBasicServer(delay?) {
  mockServer({
    send: (name, args) => {
      return mockSend(name, args, { delay });
    },
  });
}

describe('liveQuery', () => {
  beforeEach(() => {
    resetTracer();
    clearMockServer();
  });

  it(`runs and subscribes to a query`, async () => {
    mockBasicServer();
    tracer.start();

    const query = q('transactions').select('*');
    liveQuery(query, { onData: data => tracer.event('data', data) });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);

    // Simulate a sync event
    mockPublishEvent('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
  });

  it(`runs but ignores applied events (onlySync: true)`, async () => {
    mockBasicServer();
    tracer.start();

    const query = q('transactions').select('*');
    liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);

    // Simulate a sync event
    mockPublishEvent('sync-event', {
      type: 'applied',
      tables: ['transactions'],
    });

    const p = Promise.race([tracer.wait('server-query'), wait(100)]);
    expect(await p).toEqual('wait(100)');
  });

  it(`runs and updates with sync events (onlySync: true)`, async () => {
    mockBasicServer();
    tracer.start();

    const query = q('transactions').select('*');
    liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);

    // Simulate a sync event
    mockPublishEvent('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
  });

  it(`cancels existing requests`, async () => {
    let requestId = 0;
    mockServer({
      send: async (name, args) => {
        switch (name) {
          case 'query':
            const query = args;
            if (!isCountQuery(query)) {
              requestId++;
            }
            await wait(500);
            return { data: requestId, dependencies: ['transactions'] };
          default:
            throw new Error(`Command not implemented: ${name}`);
        }
      },
    });

    tracer.start();
    const query = q('transactions').select('*');
    const lq = liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    // Users should never call `run` manually but we'll do it to
    // test

    lq.run();
    await wait(0);
    lq.run();
    await wait(0);
    lq.run();
    await wait(0);
    lq.run();
    await wait(0);
    lq.run();

    // Wait for the same delay the server has
    await wait(500);
    // Data should only be returned once
    await tracer.expect('data', 6);
  });

  it(`cancels requests when server pushes`, async () => {
    mockBasicServer();
    tracer.start();

    const query = q('transactions').select('*');

    liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    // Simulate a sync event
    // Send a push in the middle of the query running for the first run
    mockPublishEvent('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });

    // The first request should get handled, but there should be no
    // `data` event
    await tracer.expect('server-query');

    // The live query simply reruns the query, ignoring the first result
    await tracer.expect('server-query');

    // And we have data!
    await tracer.expect('data', ['*']);
  });

  it(`reruns if data changes in the middle of *any* request`, async () => {
    mockBasicServer(500);
    tracer.start();

    const query = q('transactions').select('*');

    liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);

    // Simulate a sync event
    // Send two pushes in a row
    mockPublishEvent('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });
    mockPublishEvent('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });

    // Two requests will be made to the server, but the first one
    // should be ignored and we only get one data back
    await tracer.expect('server-query');
    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
  });

  it(`unsubscribes correctly`, () => async done => {
    mockBasicServer();
    tracer.start();

    const query = q('transactions').select('*');

    const lq = liveQuery(query, {
      onData: data => tracer.event('data', data),
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
    lq.unsubscribe();

    // Simulate a sync event
    mockPublishEvent('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });

    // Wait a bit and make sure nothing comes through
    const p = Promise.race([tracer.expect('server-query'), wait(100)]);

    await expect(p).resolves.toEqual('wait(100)');
    done();
  });
});
