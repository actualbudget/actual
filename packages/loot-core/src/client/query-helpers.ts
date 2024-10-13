// @ts-strict-ignore
import { listen, send } from '../platform/client/fetch';
import { once } from '../shared/async';
import { getPrimaryOrderBy, type Query } from '../shared/query';

export async function runQuery(query) {
  return send('query', query.serialize());
}

export function liveQuery<TResponse = unknown>(
  query: Query,
  onData?: Listener<TResponse>,
  opts?: LiveQueryOptions,
): LiveQuery<TResponse> {
  return LiveQuery.runNew<TResponse>(query, onData, opts);
}

export function pagedQuery<TResponse = unknown>(
  query: Query,
  onData?: Listener<TResponse>,
  opts?: PagedQueryOptions<TResponse>,
): PagedQuery<TResponse> {
  return PagedQuery.runNew<TResponse>(query, onData, opts);
}

type Data<TResponse> = ReadonlyArray<TResponse>;

type Listener<TResponse = unknown> = (
  data: Data<TResponse>,
  previousData: Data<TResponse>,
) => void;

type LiveQueryOptions = {
  onlySync?: boolean;
};

// Subscribe and refetch
export class LiveQuery<TResponse = unknown> {
  private unsubscribeSyncEvent: () => void | null;
  private data: Data<TResponse>;
  private dependencies: Set<string>;
  private listeners: Array<Listener<TResponse>>;
  private onlySync: boolean;
  private query: Query;

  // Async coordination
  private inflightRequestId: number | null;

  constructor(
    query: Query,
    onData?: Listener<TResponse>,
    opts: LiveQueryOptions = {},
  ) {
    this.query = query;
    this.data = null;
    this.dependencies = null;
    this.onlySync = opts.onlySync;
    this.listeners = [];

    if (onData) {
      this.addListener(onData);
    }
  }

  addListener = (func: Listener<TResponse>) => {
    this.listeners.push(func);

    return () => {
      this.listeners = this.listeners.filter(l => l !== func);
    };
  };

  onData = (data: Data<TResponse>, prevData: Data<TResponse>) => {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](data, prevData);
    }
  };

  onUpdate = (tables: string[]) => {
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
    return this.fetchData(() => runQuery(this.query));
  };

  static runNew = <TResponse>(
    query: Query,
    onData?: Listener<TResponse>,
    opts: LiveQueryOptions = {},
  ) => {
    const liveQuery = new LiveQuery<TResponse>(query, onData, opts);
    liveQuery.run();
    return liveQuery;
  };

  subscribe = () => {
    if (this.unsubscribeSyncEvent == null) {
      this.unsubscribeSyncEvent = listen('sync-event', ({ type, tables }) => {
        // If the user is doing optimistic updates, they don't want to
        // always refetch whenever something changes because it would
        // refetch all data after they've already updated the UI. This
        // voids the perf benefits of optimistic updates. Allow querys
        // to only react to remote syncs. By default, queries will
        // always update to all changes.
        //
        // TODO: errors?
        const syncTypes = this.onlySync ? ['success'] : ['applied', 'success'];

        if (syncTypes.indexOf(type) !== -1) {
          this.onUpdate(tables);
        }
      });
    }
  };

  unsubscribe = () => {
    if (this.unsubscribeSyncEvent) {
      this.unsubscribeSyncEvent();
      this.unsubscribeSyncEvent = null;
    }
  };

  getQuery = () => {
    return this.query;
  };

  getData = () => {
    return this.data;
  };

  getNumListeners = () => {
    return this.listeners.length;
  };

  isRunning = () => {
    return this.unsubscribeSyncEvent != null;
  };

  protected _optimisticUpdate(
    dataFunc: (data: Data<TResponse>) => Data<TResponse>,
  ) {
    const previousData = this.data;
    this.data = dataFunc(this.data);
    this.onData(this.data, previousData);
  }

  optimisticUpdate = (dataFunc: (data: Data<TResponse>) => Data<TResponse>) => {
    this._optimisticUpdate(dataFunc);
  };

  // Protected methods

  protected getInflightRequestId = () => {
    return this.inflightRequestId;
  };

  protected setData = (data: Data<TResponse>) => {
    this.data = data;
  };

  protected fetchData = async (
    runQuery: () => Promise<{
      data: Data<TResponse>;
      dependencies: Set<string>;
    }>,
  ) => {
    // TODO: precompile queries, or cache compilation results on the
    // backend. could give a query an id which makes it cacheable via
    // an LRU cache

    const reqId = Math.random();
    this.inflightRequestId = reqId;

    const { data, dependencies } = await runQuery();

    // Regardless if this request was cancelled or not, save the
    // dependencies. The query can't change so all requests will
    // return the same deps.
    if (this.dependencies == null) {
      this.dependencies = new Set(dependencies);
    }

    // Only fire events if this hasn't been cancelled and if we're
    // still subscribed (`this._subscribe` will exist)
    if (this.inflightRequestId === reqId && this.unsubscribeSyncEvent) {
      const previousData = this.data;
      this.data = data;
      this.onData(this.data, previousData);
      this.inflightRequestId = null;
    }
  };
}

type PagedQueryOptions<TResponse = unknown> = LiveQueryOptions & {
  pageCount?: number;
  onPageData?: (data: Data<TResponse>) => void;
};

// Paging
export class PagedQuery<TResponse = unknown> extends LiveQuery<TResponse> {
  private done: boolean;
  private onPageData: (data: Data<TResponse>) => void;
  private pageCount: number;
  private runPromise: Promise<void>;
  private totalCount: number;

  constructor(
    query: Query,
    onData: Listener<TResponse>,
    opts: PagedQueryOptions<TResponse> = {},
  ) {
    super(query, onData, opts);
    this.totalCount = null;
    this.pageCount = opts.pageCount || 500;
    this.runPromise = null;
    this.done = false;
    this.onPageData = opts.onPageData || (() => {});
  }

  private fetchCount = () => {
    return runQuery(this.getQuery().calculate({ $count: '*' })).then(
      ({ data }) => {
        this.totalCount = data;
      },
    );
  };

  run = () => {
    this.subscribe();

    this.runPromise = this.fetchData(async () => {
      this.done = false;

      // Also fetch the total count
      this.fetchCount();

      // If data is null, we haven't fetched anything yet so just
      // fetch the first page
      return runQuery(
        this.getQuery().limit(
          this.getData() == null
            ? this.pageCount
            : Math.max(this.getData().length, this.pageCount),
        ),
      );
    });

    return this.runPromise;
  };

  static runNew = <TResponse>(
    query: Query,
    onData?: Listener<TResponse>,
    opts: PagedQueryOptions<TResponse> = {},
  ) => {
    const pagedQuery = new PagedQuery<TResponse>(query, onData, opts);
    pagedQuery.run();
    return pagedQuery;
  };

  refetchUpToRow = async (id, defaultOrderBy) => {
    this.runPromise = this.fetchData(async () => {
      this.done = false;

      // Also fetch the total count
      this.fetchCount();

      const orderDesc = getPrimaryOrderBy(this.getQuery(), defaultOrderBy);
      if (orderDesc == null) {
        throw new Error(`refetchUpToRow requires a query with orderBy`);
      }

      const { field, order } = orderDesc;

      let result = await runQuery(this.getQuery().filter({ id }).select(field));
      if (result.data.length === 0) {
        // This row is not part of this set anymore, we can't do
        // this. We stop early to avoid possibly pulling in a ton of
        // data that we don't need
        return;
      }
      const fullRow = result.data[0];

      result = await runQuery(
        this.getQuery().filter({
          [field]: {
            [order === 'asc' ? '$lte' : '$gte']: fullRow[field],
          },
        }),
      );
      const data = result.data;

      // Load in an extra page to make room for the UI to show some
      // data after it
      result = await runQuery(
        this.getQuery()
          .filter({
            [field]: {
              [order === 'asc' ? '$gt' : '$lt']: fullRow[field],
            },
          })
          .limit(this.pageCount),
      );

      return {
        data: data.concat(result.data),
        dependencies: result.dependencies,
      };
    });

    return this.runPromise;
  };

  // The public version of this function is created below and
  // throttled by `once`
  private _fetchNext = async () => {
    while (this.getInflightRequestId()) {
      await this.runPromise;
    }

    const previousData = this.getData();

    if (!this.done) {
      const { data } = await runQuery(
        this.getQuery().limit(this.pageCount).offset(previousData.length),
      );

      // If either there is an existing request in flight or the data
      // has already changed underneath it, we can't reliably concat
      // the data since it's different now. Need to re-run the whole
      // process again
      if (this.getInflightRequestId() || previousData !== this.getData()) {
        return this.fetchNext();
      } else {
        if (data.length === 0) {
          this.done = true;
        } else {
          this.done = data.length < this.pageCount;

          const previousData = this.getData();
          this.setData(previousData.concat(data));

          // Handle newly loaded page data
          this.onPageData(data);

          // Handle entire data
          this.onData(this.getData(), previousData);
        }
      }
    }
  };

  fetchNext: () => Promise<void> = once(this._fetchNext);

  isFinished = () => {
    return this.done;
  };

  getTotalCount = () => {
    return this.totalCount;
  };

  optimisticUpdate = (dataFunc: (data: Data<TResponse>) => Data<TResponse>) => {
    const previousData = this.getData();
    super._optimisticUpdate(dataFunc);
    this.totalCount += this.getData().length - previousData.length;
  };
}
