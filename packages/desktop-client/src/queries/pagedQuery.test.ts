// @ts-strict-ignore
import * as fetch from 'loot-core/platform/client/fetch';
import { subDays } from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { resetTracer, tracer } from 'loot-core/shared/test-helpers';

import { pagedQuery } from './pagedQuery';

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

function select(row, selectExpressions) {
  return Object.fromEntries(
    selectExpressions.map(fieldName => [fieldName, row[fieldName]]),
  );
}

function selectData(data, selectExpressions) {
  return data.map(row => select(row, selectExpressions));
}

function limitOffset(data, limit, offset) {
  const start = offset != null ? offset : 0;
  const end = limit != null ? limit : data.length;
  return data.slice(start, start + end);
}

function runPagedQuery(query, data) {
  if (isCountQuery(query)) {
    return data.length;
  }

  if (query.filterExpressions.length > 0) {
    const filter = query.filterExpressions[0];
    if (filter.id != null) {
      return [data.find(row => row.id === filter.id)];
    }

    if (filter.date != null) {
      const op = Object.keys(filter.date)[0];

      return limitOffset(
        data
          .filter(row => {
            return op === '$gte'
              ? row.date >= filter.date[op]
              : op === '$lte'
                ? row.date <= filter.date[op]
                : op === '$lt'
                  ? row.date < filter.date[op]
                  : op === '$gt'
                    ? row.date > filter.date[op]
                    : false;
          })
          .map(row => select(row, query.selectExpressions)),
        query.limit,
        query.offset,
      );
    }
  } else if (query.offset != null || query.limit != null) {
    return limitOffset(
      data.map(row => select(row, query.selectExpressions)),
      query.limit,
      query.offset,
    );
  }

  throw new Error('Unable to execute query: ' + JSON.stringify(query, null, 2));
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
    listeners.forEach(listener => {
      listener(args);
    });
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

function mockPagingServer(
  dataLength,
  { delay, eventType = 'select' }: { delay?: number; eventType?: string } = {},
) {
  const data = [];
  for (let i = 0; i < dataLength; i++) {
    data.push({ id: i, date: subDays('2020-05-01', Math.floor(i / 5)) });
  }

  mockServer({
    send: async (name, args) => {
      switch (name) {
        case 'query':
          const query = args;
          tracer.event(
            'server-query',
            eventType === 'select' ? query.selectExpressions : query,
          );
          if (delay) {
            await wait(delay);
          }
          return {
            data: runPagedQuery(query, data),
            dependencies: ['transactions'],
          };
        default:
          throw new Error(`Command not implemented: ${name}`);
      }
    },
  });

  return data;
}

describe('pagedQuery', () => {
  beforeEach(() => {
    resetTracer();
    clearMockServer();
  });

  it(`runs and subscribes to a query`, async () => {
    mockBasicServer();
    tracer.start();

    const query = q('transactions').select('*');
    pagedQuery(query, { onData: data => tracer.event('data', data) });

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
    pagedQuery(query, {
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
    pagedQuery(query, {
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
    const lq = pagedQuery(query, {
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

    pagedQuery(query, {
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

    pagedQuery(query, {
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

    const lq = pagedQuery(query, {
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

  it('pagedQuery makes requests in pages', () => async done => {
    const data = mockPagingServer(1502);
    tracer.start();

    const query = q('transactions').select('id');
    const paged = pagedQuery(query, {
      onData: data => tracer.event('data', data),
      onPageData: data => tracer.event('page-data', data),
    });

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);

    await tracer.expect('data', async d => {
      expect(d.length).toBe(500);
      expect(d[0].id).toBe(data[0].id);
    });

    expect(paged.totalCount).toBe(data.length);

    await paged.fetchNext();
    tracer.expectNow('server-query', ['id']);
    tracer.expectNow('page-data', d => {
      expect(d.length).toBe(500);
      expect(d[0].id).toBe(data[500].id);
    });
    tracer.expectNow('data', d => {
      expect(d.length).toBe(1000);
    });
    expect(paged.hasNext).toBe(true);

    await paged.fetchNext();
    tracer.expectNow('server-query', ['id']);
    tracer.expectNow('page-data', d => {
      expect(d.length).toBe(500);
      expect(d[0].id).toBe(data[1000].id);
    });
    tracer.expectNow('data', d => {
      expect(d.length).toBe(1500);
    });
    expect(paged.hasNext).toBe(true);

    await paged.fetchNext();
    tracer.expectNow('server-query', ['id']);
    tracer.expectNow('page-data', d => {
      expect(d.length).toBe(2);
      expect(d[0].id).toBe(data[1500].id);
    });
    tracer.expectNow('data', d => {
      expect(d.length).toBe(1502);
    });

    expect(paged.data).toEqual(selectData(data, ['id']));
    expect(paged.hasNext).toBe(false);

    await paged.fetchNext();
    // Wait a bit and make sure nothing comes through
    const p = Promise.race([tracer.expect('server-query'), wait(100)]);
    expect(await p).toEqual('wait(100)');
    done();
  });

  it('pagedQuery allows customizing page count', async () => {
    const data = mockPagingServer(50);
    tracer.start();

    const query = q('transactions').select('id');
    pagedQuery(query, {
      onData: data => tracer.event('data', data),
      options: { pageCount: 10 },
    });

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);

    // Should only get 10 items back
    await tracer.expect('data', selectData(data, ['id']).slice(0, 10));
  });

  it('pagedQuery only runs `fetchNext` once at a time', () => async done => {
    mockPagingServer(1000, { delay: 200 });
    tracer.start();

    const query = q('transactions').select('id');
    const paged = pagedQuery(query, {
      onData: data => tracer.event('data', data),
    });

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);
    await tracer.expect('data', vi.fn());

    paged.fetchNext();
    paged.fetchNext();
    await wait(2);
    paged.fetchNext();

    await tracer.expect('server-query', ['id']);
    await tracer.expect('data', vi.fn());

    // Wait a bit and make sure nothing comes through
    const p = Promise.race([tracer.expect('server-query'), wait(200)]);
    expect(await p).toEqual('wait(200)');
    done();
  });

  it('pagedQuery refetches all paged data on update', async () => {
    const data = mockPagingServer(500, { delay: 200 });
    tracer.start();

    const query = q('transactions').select('id');
    const paged = pagedQuery(query, {
      onData: data => tracer.event('data', data),
      onPageData: data => tracer.event('page-data', data),
      options: { pageCount: 20 },
    });

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);
    await tracer.expect('data', d => {
      expect(d.length).toBe(20);
    });

    await paged.fetchNext();

    await tracer.expect('server-query', ['id']);
    await tracer.expect('page-data', d => {
      expect(d.length).toBe(20);
      expect(d[0].id).toBe(data[20].id);
    });
    await tracer.expect('data', d => {
      expect(d.length).toBe(40);
    });

    // Simulate a sync event
    mockPublishEvent('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);
    await tracer.expect('data', d => {
      // All 40 we fetched again
      expect(d.length).toBe(40);
    });
  });

  it('pagedQuery reruns `fetchNext` if data changed underneath it', async () => {
    const data = mockPagingServer(500, { delay: 10 });
    const query = q('transactions').select('id');
    const paged = pagedQuery(query, {
      onData: data => tracer.event('data', data),
      onPageData: data => tracer.event('page-data', data),
      options: { pageCount: 20 },
    });

    await paged.fetchNext();

    tracer.start();

    paged.fetchNext().then(() => {
      tracer.event('page-finished');
    });

    await wait(1);
    // Simulate a sync event
    mockPublishEvent('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });

    // This is from the paged request, but it ignores the new data
    await tracer.expect('server-query', ['id']);

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);
    await tracer.expect('data', d => {
      expect(d.length).toBe(40);
    });

    // Now the paged request reruns
    await tracer.expect('server-query', ['id']);
    await tracer.expect('page-data', d => {
      expect(d.length).toBe(20);
      expect(d[0].id).toBe(data[40].id);
    });
    await tracer.expect('data', d => {
      expect(d.length).toBe(60);
    });

    // Make sure the page promise is never resolved until everything
    // has settled
    await tracer.expect('page-finished');
  });

  it('pagedQuery fetches up to a specific row', async () => {
    const data = mockPagingServer(500, { delay: 10, eventType: 'all' });
    const query = q('transactions').select(['id', 'date']);
    const paged = pagedQuery(query, {
      onData: data => tracer.event('data', data),
      onPageData: data => tracer.event('page-data', data),
      options: { pageCount: 20 },
    });
    await paged.run();

    tracer.start();

    const item = data.find(row => row.id === 300);
    paged.refetchUpToRow(item.id, { field: 'date', order: 'desc' });

    await tracer.expect(
      'server-query',
      expect.objectContaining({
        selectExpressions: [{ result: { $count: '*' } }],
      }),
    );
    await tracer.expect(
      'server-query',
      expect.objectContaining({ filterExpressions: [{ id: 300 }] }),
    );
    await tracer.expect(
      'server-query',
      expect.objectContaining({
        filterExpressions: [{ date: { $gte: item.date } }],
      }),
    );
    await tracer.expect(
      'server-query',
      expect.objectContaining({
        filterExpressions: [{ date: { $lt: item.date } }],
        limit: 20,
      }),
    );
    await tracer.expect(
      'data',
      data.slice(0, data.findIndex(row => row.date < item.date) + 20),
    );

    await wait(1000);
  });
});
