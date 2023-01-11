import { listen, send } from '../platform/client/fetch';
import { once } from '../shared/async';
import q, { getPrimaryOrderBy } from '../shared/query';
export default q;

export async function runQuery(query) {
  return send('query', query.serialize());
}

export function liveQuery(query, onData, opts) {
  let q = new LiveQuery(query, onData, opts);
  q.run();
  return q;
}

export function pagedQuery(query, onData, opts) {
  let q = new PagedQuery(query, onData, opts);
  q.run();
  return q;
}

// Subscribe and refetch
export class LiveQuery {
  constructor(query, onData, opts = {}) {
    this.error = new Error();
    this.query = query;
    this.data = null;
    this.mappedData = null;
    this.dependencies = null;
    this.mapper = opts.mapper;
    this.onlySync = opts.onlySync;
    this.listeners = [];

    // Async coordination
    this.inflight = false;
    this.restart = false;

    if (onData) {
      this.addListener(onData);
    }
  }

  addListener(func) {
    this.listeners.push(func);

    return () => {
      this.listeners = this.listeners.filter(l => l !== func);
    };
  }

  onData = (data, prevData) => {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](data, prevData);
    }
  };

  onUpdate = tables => {
    // We might not know the dependencies if the first query result
    // hasn't come back yet
    if (
      this.dependencies == null ||
      tables.find(table => this.dependencies.has(table))
    ) {
      this.run();
    }
  };

  run = () => {
    this.subscribe();
    return this._fetchData(() => runQuery(this.query));
  };

  _fetchData = async makeRequest => {
    // TODO: precompile queries, or cache compilation results on the
    // backend. could give a query an id which makes it cacheable via
    // an LRU cache

    let reqId = Math.random();
    this.inflightRequestId = reqId;

    let { data, dependencies } = await makeRequest();

    // Regardless if this request was cancelled or not, save the
    // dependencies. The query can't change so all requests will
    // return the same deps.
    if (this.dependencies == null) {
      this.dependencies = new Set(dependencies);
    }

    // Only fire events if this hasn't been cancelled and if we're
    // still subscribed (`this._subscribe` will exist)
    if (this.inflightRequestId === reqId && this._unsubscribe) {
      let prevData = this.mappedData;
      this.data = data;
      this.mappedData = this.mapData(data);
      this.onData(this.mappedData, prevData);
      this.inflightRequestId = null;
    }
  };

  subscribe = () => {
    if (this._unsubscribe == null) {
      this._unsubscribe = listen('sync-event', ({ type, tables }) => {
        // If the user is doing optimistic updates, they don't want to
        // always refetch whenever something changes because it would
        // refetch all data after they've already updated the UI. This
        // voids the perf benefits of optimistic updates. Allow querys
        // to only react to remote syncs. By default, queries will
        // always update to all changes.
        //
        // TODO: errors?
        let syncTypes = this.onlySync ? ['success'] : ['applied', 'success'];

        if (syncTypes.indexOf(type) !== -1) {
          this.onUpdate(tables);
        }
      });
    }
  };

  unsubscribe = () => {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  };

  mapData = data => {
    if (this.mapper) {
      return this.mapper(data);
    }
    return data;
  };

  getQuery = () => {
    return this.query;
  };

  getData = () => {
    return this.mappedData;
  };

  getNumListeners = () => {
    return this.listeners.length;
  };

  isRunning = () => {
    return this._unsubscribe != null;
  };

  _optimisticUpdate = (dataFunc, mappedDataFunc) => {
    this.data = dataFunc(this.data);
    this.mappedData = mappedDataFunc(this.mappedData);
  };

  optimisticUpdate = (dataFunc, mappedDataFunc) => {
    let prevMappedData = this.mappedData;
    this._optimisticUpdate(dataFunc, mappedDataFunc);
    this.onData(this.mappedData, prevMappedData);
  };
}

// Paging
export class PagedQuery extends LiveQuery {
  constructor(query, onData, opts = {}) {
    super(query, onData, opts);
    this.totalCount = null;
    this.pageCount = opts.pageCount || 500;
    this.runPromise = null;
    this.done = false;
    this.onPageData = opts.onPageData || (() => {});
  }

  _fetchCount = () => {
    return runQuery(this.query.calculate({ $count: '*' })).then(({ data }) => {
      this.totalCount = data;
    });
  };

  run = () => {
    this.subscribe();

    this.runPromise = this._fetchData(async () => {
      this.done = false;

      // Also fetch the total count
      this._fetchCount();

      // If data is null, we haven't fetched anything yet so just
      // fetch the first page
      return runQuery(
        this.query.limit(
          this.data == null
            ? this.pageCount
            : Math.max(this.data.length, this.pageCount)
        )
      );
    });

    return this.runPromise;
  };

  refetchUpToRow = async (id, defaultOrderBy) => {
    this.runPromise = this._fetchData(async () => {
      this.done = false;

      // Also fetch the total count
      this._fetchCount();

      let orderDesc = getPrimaryOrderBy(this.query, defaultOrderBy);
      if (orderDesc == null) {
        throw new Error(`refetchUpToRow requires a query with orderBy`);
      }

      let { field, order } = orderDesc;

      let result = await runQuery(this.query.filter({ id }).select(field));
      if (result.data.length === 0) {
        // This row is not part of this set anymore, we can't do
        // this. We stop early to avoid possibly pulling in a ton of
        // data that we don't need
        return;
      }
      let fullRow = result.data[0];

      result = await runQuery(
        this.query.filter({
          [field]: {
            [order === 'asc' ? '$lte' : '$gte']: fullRow[field]
          }
        })
      );
      let data = result.data;

      // Load in an extra page to make room for the UI to show some
      // data after it
      result = await runQuery(
        this.query
          .filter({
            [field]: {
              [order === 'asc' ? '$gt' : '$lt']: fullRow[field]
            }
          })
          .limit(this.pageCount)
      );

      return {
        data: data.concat(result.data),
        dependencies: result.dependencies
      };
    });

    return this.runPromise;
  };

  // The public version of this function is created below and
  // throttled by `once`
  _fetchNext = async () => {
    while (this.inflightRequestId) {
      await this.runPromise;
    }

    let previousData = this.data;

    if (!this.done) {
      let { data } = await runQuery(
        this.query.limit(this.pageCount).offset(previousData.length)
      );

      // If either there is an existing request in flight or the data
      // has already changed underneath it, we can't reliably concat
      // the data since it's different now. Need to re-run the whole
      // process again
      if (this.inflightRequestId || previousData !== this.data) {
        return this._fetchNext();
      } else {
        if (data.length === 0) {
          this.done = true;
        } else {
          this.done = data.length < this.pageCount;
          this.data = this.data.concat(data);

          let prevData = this.mappedData;
          let mapped = this.mapData(data);
          this.mappedData = this.mappedData.concat(mapped);
          this.onPageData(mapped);
          this.onData(this.mappedData, prevData);
        }
      }
    }
  };

  fetchNext = once(this._fetchNext);

  isFinished = () => {
    return this.done;
  };

  getTotalCount = () => {
    return this.totalCount;
  };

  optimisticUpdate = (dataFunc, mappedDataFunc) => {
    let prevData = this.data;
    let prevMappedData = this.mappedData;

    this._optimisticUpdate(dataFunc, mappedDataFunc);
    this.totalCount += this.data.length - prevData.length;

    this.onData(this.mappedData, prevMappedData);
  };
}
