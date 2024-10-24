// @ts-strict-ignore
import { listen, send } from '../platform/client/fetch';
import { once } from '../shared/async';
import { getPrimaryOrderBy, type Query } from '../shared/query';

export async function runQuery(query) {
  return send('query', query.serialize());
}

export function liveQuery<TResponse = unknown>(
  query: Query,
  {
    onData,
    onError,
    options = {},
  }: {
    onData?: Listener<TResponse>;
    onError?: (error: Error) => void;
    options?: LiveQueryOptions;
  },
): LiveQuery<TResponse> {
  return LiveQuery.runLiveQuery<TResponse>(query, onData, onError, options);
}

export function pagedQuery<TResponse = unknown>(
  query: Query,
  {
    onData,
    onError,
    onPageData,
    options = {},
  }: {
    onData?: Listener<TResponse>;
    onError?: (error: Error) => void;
    onPageData?: (data: Data<TResponse>) => void;
    options?: PagedQueryOptions;
  },
): PagedQuery<TResponse> {
  return PagedQuery.runPagedQuery<TResponse>(
    query,
    onData,
    onError,
    onPageData,
    options,
  );
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
  private _unsubscribeSyncEvent: () => void | null;
  private _data: Data<TResponse>;
  private _dependencies: Set<string>;
  private _listeners: Array<Listener<TResponse>>;
  private _supportedSyncTypes: Set<string>;
  private _query: Query;
  private _onError: (error: Error) => void;

  get query() {
    return this._query;
  }

  get data() {
    return this._data;
  }

  private set data(data: Data<TResponse>) {
    this._data = data;
  }

  get isRunning() {
    return this._unsubscribeSyncEvent != null;
  }

  // Async coordination
  private _inflightRequestId: number | null;

  protected get inflightRequestId() {
    return this._inflightRequestId;
  }

  private set inflightRequestId(id: number) {
    this._inflightRequestId = id;
  }

  constructor(
    query: Query,
    onData: Listener<TResponse>,
    onError?: (error: Error) => void,
    options: LiveQueryOptions = {},
  ) {
    this._query = query;
    this._data = null;
    this._dependencies = null;
    this._listeners = [];
    this._onError = onError || (() => {});

    // TODO: error types?
    this._supportedSyncTypes = options.onlySync
      ? new Set<string>(['success'])
      : new Set<string>(['applied', 'success']);

    if (onData) {
      this.addListener(onData);
    }
  }

  addListener = (func: Listener<TResponse>) => {
    this._listeners.push(func);

    return () => {
      this._listeners = this._listeners.filter(l => l !== func);
    };
  };

  protected onData = (data: Data<TResponse>, prevData: Data<TResponse>) => {
    for (let i = 0; i < this._listeners.length; i++) {
      this._listeners[i](data, prevData);
    }
  };

  protected onError = (error: Error) => {
    this._onError(error);
  };

  protected onUpdate = (tables: string[]) => {
    // We might not know the dependencies if the first query result
    // hasn't come back yet
    if (
      this._dependencies == null ||
      tables.find(table => this._dependencies.has(table))
    ) {
      this.run();
    }
  };

  run = () => {
    this.subscribe();
    return this.fetchData(() => runQuery(this._query));
  };

  static runLiveQuery = <TResponse>(
    query: Query,
    onData: Listener<TResponse>,
    onError: (error: Error) => void,
    options: LiveQueryOptions = {},
  ) => {
    const liveQuery = new LiveQuery<TResponse>(query, onData, onError, options);
    liveQuery.run();
    return liveQuery;
  };

  protected subscribe = () => {
    if (this._unsubscribeSyncEvent == null) {
      this._unsubscribeSyncEvent = listen('sync-event', ({ type, tables }) => {
        // If the user is doing optimistic updates, they don't want to
        // always refetch whenever something changes because it would
        // refetch all data after they've already updated the UI. This
        // voids the perf benefits of optimistic updates. Allow querys
        // to only react to remote syncs. By default, queries will
        // always update to all changes.
        if (this._supportedSyncTypes.has(type)) {
          this.onUpdate(tables);
        }
      });
    }
  };

  unsubscribe = () => {
    if (this._unsubscribeSyncEvent) {
      this._unsubscribeSyncEvent();
      this._unsubscribeSyncEvent = null;
    }
  };

  protected _optimisticUpdate = (
    updateFn: (data: Data<TResponse>) => Data<TResponse>,
  ) => {
    const previousData = this.data;
    this.updateData(updateFn);
    this.onData(this.data, previousData);
  };

  optimisticUpdate = (dataFunc: (data: Data<TResponse>) => Data<TResponse>) => {
    this._optimisticUpdate(dataFunc);
  };

  protected updateData = (
    updateFn: (data: Data<TResponse>) => Data<TResponse>,
  ) => {
    this.data = updateFn(this.data);
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

    try {
      const { data, dependencies } = await runQuery();

      // Regardless if this request was cancelled or not, save the
      // dependencies. The query can't change so all requests will
      // return the same deps.
      if (this._dependencies == null) {
        this._dependencies = new Set(dependencies);
      }

      // Only fire events if this hasn't been cancelled and if we're
      // still subscribed (`this.unsubscribeSyncEvent` will exist)
      if (this.inflightRequestId === reqId && this._unsubscribeSyncEvent) {
        const previousData = this.data;
        this.data = data;
        this.onData(this.data, previousData);
        this.inflightRequestId = null;
      }
    } catch (e) {
      console.log('Error fetching data', e);
      this.onError(e);
    }
  };
}

type PagedQueryOptions = LiveQueryOptions & {
  pageCount?: number;
};

// Paging
export class PagedQuery<TResponse = unknown> extends LiveQuery<TResponse> {
  private _hasReachedEnd: boolean;
  private _onPageData: (data: Data<TResponse>) => void;
  private _pageCount: number;
  private _fetchDataPromise: Promise<void> | null;
  private _totalCount: number;

  get hasNext() {
    return !this._hasReachedEnd;
  }

  get totalCount() {
    return this._totalCount;
  }

  constructor(
    query: Query,
    onData: Listener<TResponse>,
    onError?: (error: Error) => void,
    onPageData?: (data: Data<TResponse>) => void,
    options: PagedQueryOptions = {},
  ) {
    super(query, onData, onError, options);
    this._totalCount = 0;
    this._pageCount = options.pageCount || 500;
    this._fetchDataPromise = null;
    this._hasReachedEnd = false;
    this._onPageData = onPageData || (() => {});
  }

  private fetchCount = () => {
    return runQuery(this.query.calculate({ $count: '*' })).then(({ data }) => {
      this._totalCount = data;
    });
  };

  run = () => {
    this.subscribe();

    this._fetchDataPromise = this.fetchData(async () => {
      this._hasReachedEnd = false;

      // Also fetch the total count
      this.fetchCount();

      // If data is null, we haven't fetched anything yet so just
      // fetch the first page
      return runQuery(
        this.query.limit(
          this.data == null
            ? this._pageCount
            : Math.max(this.data.length, this._pageCount),
        ),
      );
    });

    return this._fetchDataPromise;
  };

  static runPagedQuery = <TResponse>(
    query: Query,
    onData?: Listener<TResponse>,
    onError?: (error: Error) => void,
    onPageData?: (data: Data<TResponse>) => void,
    options: PagedQueryOptions = {},
  ) => {
    const pagedQuery = new PagedQuery<TResponse>(
      query,
      onData,
      onError,
      onPageData,
      options,
    );
    pagedQuery.run();
    return pagedQuery;
  };

  refetchUpToRow = async (id, defaultOrderBy) => {
    this._fetchDataPromise = this.fetchData(async () => {
      this._hasReachedEnd = false;

      // Also fetch the total count
      this.fetchCount();

      const orderDesc = getPrimaryOrderBy(this.query, defaultOrderBy);
      if (orderDesc == null) {
        throw new Error(`refetchUpToRow requires a query with orderBy`);
      }

      const { field, order } = orderDesc;

      let result = await runQuery(this.query.filter({ id }).select(field));
      if (result.data.length === 0) {
        // This row is not part of this set anymore, we can't do
        // this. We stop early to avoid possibly pulling in a ton of
        // data that we don't need
        return;
      }
      const fullRow = result.data[0];

      result = await runQuery(
        this.query.filter({
          [field]: {
            [order === 'asc' ? '$lte' : '$gte']: fullRow[field],
          },
        }),
      );
      const data = result.data;

      // Load in an extra page to make room for the UI to show some
      // data after it
      result = await runQuery(
        this.query
          .filter({
            [field]: {
              [order === 'asc' ? '$gt' : '$lt']: fullRow[field],
            },
          })
          .limit(this._pageCount),
      );

      return {
        data: data.concat(result.data),
        dependencies: result.dependencies,
      };
    });

    return this._fetchDataPromise;
  };

  private onPageData = (data: Data<TResponse>) => {
    this._onPageData(data);
  };

  // The public version of this function is created below and
  // throttled by `once`
  private _fetchNext = async () => {
    while (this.inflightRequestId) {
      await this._fetchDataPromise;
    }

    const previousData = this.data;

    if (!this._hasReachedEnd) {
      const { data } = await runQuery(
        this.query.limit(this._pageCount).offset(previousData.length),
      );

      // If either there is an existing request in flight or the data
      // has already changed underneath it, we can't reliably concat
      // the data since it's different now. Need to re-run the whole
      // process again
      if (this.inflightRequestId || previousData !== this.data) {
        return this._fetchNext();
      } else {
        if (data.length === 0) {
          this._hasReachedEnd = true;
        } else {
          this._hasReachedEnd = data.length < this._pageCount;

          const prevData = this.data;
          this.updateData(currentData => currentData.concat(data));

          // Handle newly loaded page data
          this.onPageData(data);

          // Handle entire data
          this.onData(this.data, prevData);
        }
      }
    }
  };

  fetchNext: () => Promise<void> = once(this._fetchNext);

  optimisticUpdate = (updateFn: (data: Data<TResponse>) => Data<TResponse>) => {
    const previousData = this.data;
    this._optimisticUpdate(updateFn);
    this._totalCount += this.data.length - previousData.length;
  };
}
