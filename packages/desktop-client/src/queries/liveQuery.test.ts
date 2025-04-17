// @ts-strict-ignore
import { initServer, serverPush } from 'loot-core/platform/client/fetch';
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

function initBasicServer(delay?) {
  initServer({
    query: async query => {
      if (!isCountQuery(query)) {
        tracer.event('server-query');
      }
      if (delay) {
        await wait(delay);
      }
      return { data: query.selectExpressions, dependencies: ['transactions'] };
    },
  });
}

describe('liveQuery', () => {
  beforeEach(() => {
    resetTracer();
  });

  it(`runs and subscribes to a query`, async () => {
    initBasicServer();
    tracer.start();

    const query = q('transactions').select('*');
    liveQuery(query, { onData: data => tracer.event('data', data) });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);

    serverPush('sync-event', { type: 'success', tables: ['transactions'] });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
  });

  it(`runs but ignores applied events (onlySync: true)`, async () => {
    initBasicServer();
    tracer.start();

    const query = q('transactions').select('*');
    liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });

    const p = Promise.race([tracer.wait('server-query'), wait(100)]);
    expect(await p).toEqual('wait(100)');
  });

  it(`runs and updates with sync events (onlySync: true)`, async () => {
    initBasicServer();
    tracer.start();

    const query = q('transactions').select('*');
    liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
    serverPush('sync-event', { type: 'success', tables: ['transactions'] });
    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
  });

  it(`cancels existing requests`, async () => {
    let requestId = 0;
    initServer({
      query: async query => {
        if (!isCountQuery(query)) {
          requestId++;
        }
        await wait(500);
        return { data: requestId, dependencies: ['transactions'] };
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
    initBasicServer();
    tracer.start();

    const query = q('transactions').select('*');

    liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    // Send a push in the middle of the query running for the first run
    serverPush('sync-event', { type: 'success', tables: ['transactions'] });
    // The first request should get handled, but there should be no
    // `data` event
    await tracer.expect('server-query');

    // The live query simply reruns the query, ignoring the first result
    await tracer.expect('server-query');

    // And we have data!
    await tracer.expect('data', ['*']);
  });

  it(`reruns if data changes in the middle of *any* request`, async () => {
    initBasicServer(500);
    tracer.start();

    const query = q('transactions').select('*');

    liveQuery(query, {
      onData: data => tracer.event('data', data),
      options: { onlySync: true },
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);

    // Send two pushes in a row
    serverPush('sync-event', { type: 'success', tables: ['transactions'] });
    serverPush('sync-event', { type: 'success', tables: ['transactions'] });

    // Two requests will be made to the server, but the first one
    // should be ignored and we only get one data back
    await tracer.expect('server-query');
    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
  });

  it(`unsubscribes correctly`, async () => {
    initBasicServer();
    tracer.start();

    const query = q('transactions').select('*');

    const lq = liveQuery(query, {
      onData: data => tracer.event('data', data),
    });

    await tracer.expect('server-query');
    await tracer.expect('data', ['*']);
    lq.unsubscribe();

    serverPush('sync-event', { type: 'success', tables: ['transactions'] });

    // Wait a bit and make sure nothing comes through
    const p = Promise.race([tracer.expect('server-query'), wait(100)]);
    expect(await p).toEqual('wait(100)');
  });
});
