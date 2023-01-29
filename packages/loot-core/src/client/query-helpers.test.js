import { initServer, serverPush } from '../platform/client/fetch';
import { subDays } from '../shared/months';
import q from '../shared/query';
import { tracer } from '../shared/test-helpers';

import { runQuery, liveQuery, pagedQuery } from './query-helpers';

function wait(n) {
  return new Promise(resolve => setTimeout(() => resolve(`wait(${n})`), n));
}

function isCountQuery(query) {
  if (query.selectExpressions.length === 1) {
    let select = query.selectExpressions[0];
    return select.result && select.result.$count === '*';
  }

  return false;
}

function select(row, selectExpressions) {
  return Object.fromEntries(
    selectExpressions.map(fieldName => [fieldName, row[fieldName]])
  );
}

function selectData(data, selectExpressions) {
  return data.map(row => select(row, selectExpressions));
}

function limitOffset(data, limit, offset) {
  let start = offset != null ? offset : 0;
  let end = limit != null ? limit : data.length;
  return data.slice(start, start + end);
}

function runPagedQuery(query, data) {
  if (isCountQuery(query)) {
    return data.length;
  }

  if (query.filterExpressions.length > 0) {
    let filter = query.filterExpressions[0];
    if (filter.id != null) {
      return [data.find(row => row.id === filter.id)];
    }

    if (filter.date != null) {
      let op = Object.keys(filter.date)[0];

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
        query.offset
      );
    }
  } else if (query.offset != null || query.limit != null) {
    return limitOffset(
      data.map(row => select(row, query.selectExpressions)),
      query.limit,
      query.offset
    );
  }

  throw new Error('Unable to execute query: ' + JSON.stringify(query, null, 2));
}

function initBasicServer(delay) {
  initServer({
    query: async query => {
      if (!isCountQuery(query)) {
        tracer.event('server-query');
      }
      if (delay) {
        await wait(delay);
      }
      return { data: query.selectExpressions, dependencies: ['transactions'] };
    }
  });
}

function initPagingServer(dataLength, { delay, eventType = 'select' } = {}) {
  let data = [];
  for (let i = 0; i < dataLength; i++) {
    data.push({ id: i, date: subDays('2020-05-01', Math.floor(i / 5)) });
  }

  initServer({
    query: async query => {
      tracer.event(
        'server-query',
        eventType === 'select' ? query.selectExpressions : query
      );
      if (delay) {
        await wait(delay);
      }
      return {
        data: runPagedQuery(query, data),
        dependencies: ['transactions']
      };
    }
  });

  return data;
}

describe('query helpers', () => {
  it('runQuery runs a query', async () => {
    initServer({ query: query => ({ data: query, dependencies: [] }) });

    let query = q('transactions').select('*');
    let { data } = await runQuery(query);
    expect(data).toEqual(query.serialize());
  });

  ['liveQuery', 'pagedQuery'].forEach(queryType => {
    let doQuery = queryType === 'liveQuery' ? liveQuery : pagedQuery;

    it(`${queryType} runs and subscribes to a query`, async () => {
      initBasicServer();
      tracer.start();

      let query = q('transactions').select('*');
      doQuery(query, data => tracer.event('data', data));

      await tracer.expect('server-query');
      await tracer.expect('data', ['*']);

      serverPush('sync-event', { type: 'success', tables: ['transactions'] });

      await tracer.expect('server-query');
      await tracer.expect('data', ['*']);
    });

    it(`${queryType} runs but ignores applied events (onlySync: true)`, async () => {
      initBasicServer();
      tracer.start();

      let query = q('transactions').select('*');
      doQuery(query, data => tracer.event('data', data), { onlySync: true });

      await tracer.expect('server-query');
      await tracer.expect('data', ['*']);
      serverPush('sync-event', { type: 'applied', tables: ['transactions'] });

      let p = Promise.race([tracer.wait('server-query'), wait(100)]);
      expect(await p).toEqual('wait(100)');
    });

    it(`${queryType} runs and updates with sync events (onlySync: true)`, async () => {
      initBasicServer();
      tracer.start();

      let query = q('transactions').select('*');
      doQuery(query, data => tracer.event('data', data), { onlySync: true });

      await tracer.expect('server-query');
      await tracer.expect('data', ['*']);
      serverPush('sync-event', { type: 'success', tables: ['transactions'] });
      await tracer.expect('server-query');
      await tracer.expect('data', ['*']);
    });

    it(`${queryType} cancels existing requests`, async () => {
      let requestId = 0;
      initServer({
        query: async query => {
          if (!isCountQuery(query)) {
            requestId++;
          }
          await wait(500);
          return { data: requestId, dependencies: ['transactions'] };
        }
      });

      tracer.start();
      let query = q('transactions').select('*');
      let lq = doQuery(query, data => tracer.event('data', data), {
        onlySync: true
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

    it(`${queryType} cancels requests when server pushes`, async () => {
      initBasicServer();
      tracer.start();

      let query = q('transactions').select('*');

      doQuery(query, data => tracer.event('data', data), { onlySync: true });

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

    it(`${queryType} reruns if data changes in the middle of *any* request`, async () => {
      initBasicServer(500);
      tracer.start();

      let query = q('transactions').select('*');

      doQuery(query, data => tracer.event('data', data), { onlySync: true });

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

    it(`${queryType} unsubscribes correctly`, async () => {
      initBasicServer();
      tracer.start();

      let query = q('transactions').select('*');

      let lq = doQuery(query, data => tracer.event('data', data));

      await tracer.expect('server-query');
      await tracer.expect('data', ['*']);
      lq.unsubscribe();

      serverPush('sync-event', { type: 'success', tables: ['transactions'] });

      // Wait a bit and make sure nothing comes through
      let p = Promise.race([tracer.expect('server-query'), wait(100)]);
      expect(await p).toEqual('wait(100)');
    });
  });

  it('pagedQuery makes requests in pages', async () => {
    let data = initPagingServer(1502);
    tracer.start();

    let query = q('transactions').select('id');
    let paged = pagedQuery(query, data => tracer.event('data', data), {
      onPageData: data => tracer.event('page-data', data)
    });

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);

    await tracer.expect('data', async d => {
      expect(d.length).toBe(500);
      expect(d[0].id).toBe(data[0].id);
    });

    expect(paged.getTotalCount()).toBe(data.length);

    await paged.fetchNext();
    tracer.expectNow('server-query', ['id']);
    tracer.expectNow('page-data', d => {
      expect(d.length).toBe(500);
      expect(d[0].id).toBe(data[500].id);
    });
    tracer.expectNow('data', d => {
      expect(d.length).toBe(1000);
    });
    expect(paged.isFinished()).toBe(false);

    await paged.fetchNext();
    tracer.expectNow('server-query', ['id']);
    tracer.expectNow('page-data', d => {
      expect(d.length).toBe(500);
      expect(d[0].id).toBe(data[1000].id);
    });
    tracer.expectNow('data', d => {
      expect(d.length).toBe(1500);
    });
    expect(paged.isFinished()).toBe(false);

    await paged.fetchNext();
    tracer.expectNow('server-query', ['id']);
    tracer.expectNow('page-data', d => {
      expect(d.length).toBe(2);
      expect(d[0].id).toBe(data[1500].id);
    });
    tracer.expectNow('data', d => {
      expect(d.length).toBe(1502);
    });

    expect(paged.getData()).toEqual(selectData(data, ['id']));
    expect(paged.isFinished()).toBe(true);

    await paged.fetchNext();
    // Wait a bit and make sure nothing comes through
    let p = Promise.race([tracer.expect('server-query'), wait(100)]);
    expect(await p).toEqual('wait(100)');
  });

  it('pagedQuery allows customizing page count', async () => {
    let data = initPagingServer(50);
    tracer.start();

    let query = q('transactions').select('id');
    pagedQuery(query, data => tracer.event('data', data), {
      pageCount: 10
    });

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);

    // Should only get 10 items back
    await tracer.expect('data', selectData(data, ['id']).slice(0, 10));
  });

  it('pagedQuery only runs `fetchNext` once at a time', async () => {
    initPagingServer(1000, { delay: 200 });
    tracer.start();

    let query = q('transactions').select('id');
    let paged = pagedQuery(query, data => tracer.event('data', data));

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);
    await tracer.expect('data', data => {});

    paged.fetchNext();
    paged.fetchNext();
    await wait(2);
    paged.fetchNext();

    await tracer.expect('server-query', ['id']);
    await tracer.expect('data', data => {});

    // Wait a bit and make sure nothing comes through
    let p = Promise.race([tracer.expect('server-query'), wait(200)]);
    expect(await p).toEqual('wait(200)');
  });

  it('pagedQuery refetches all paged data on update', async () => {
    let data = initPagingServer(500, { delay: 200 });
    tracer.start();

    let query = q('transactions').select('id');
    let paged = pagedQuery(query, data => tracer.event('data', data), {
      pageCount: 20,
      onPageData: data => tracer.event('page-data', data)
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

    serverPush('sync-event', { type: 'success', tables: ['transactions'] });

    await tracer.expect('server-query', [{ result: { $count: '*' } }]);
    await tracer.expect('server-query', ['id']);
    await tracer.expect('data', d => {
      // All 40 we fetched again
      expect(d.length).toBe(40);
    });
  });

  it('pagedQuery reruns `fetchNext` if data changed underneath it', async () => {
    let data = initPagingServer(500, { delay: 10 });
    let query = q('transactions').select('id');
    let paged = pagedQuery(query, data => tracer.event('data', data), {
      pageCount: 20,
      onPageData: data => tracer.event('page-data', data)
    });

    await paged.fetchNext();

    tracer.start();

    paged.fetchNext().then(() => {
      tracer.event('page-finished');
    });

    await wait(1);
    serverPush('sync-event', { type: 'success', tables: ['transactions'] });

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
    let data = initPagingServer(500, { delay: 10, eventType: 'all' });
    let query = q('transactions').select(['id', 'date']);
    let paged = pagedQuery(query, data => tracer.event('data', data), {
      pageCount: 20,
      onPageData: data => tracer.event('page-data', data)
    });
    await paged.run();

    tracer.start();

    let item = data.find(row => row.id === 300);
    paged.refetchUpToRow(item.id, { field: 'date', order: 'desc' });

    await tracer.expect(
      'server-query',
      expect.objectContaining({
        selectExpressions: [{ result: { $count: '*' } }]
      })
    );
    await tracer.expect(
      'server-query',
      expect.objectContaining({ filterExpressions: [{ id: 300 }] })
    );
    await tracer.expect(
      'server-query',
      expect.objectContaining({
        filterExpressions: [{ date: { $gte: item.date } }]
      })
    );
    await tracer.expect(
      'server-query',
      expect.objectContaining({
        filterExpressions: [{ date: { $lt: item.date } }],
        limit: 20
      })
    );
    await tracer.expect(
      'data',
      data.slice(0, data.findIndex(row => row.date < item.date) + 20)
    );

    await wait(1000);
  });
});
