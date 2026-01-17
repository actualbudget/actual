// @ts-strict-ignore
import { listen } from 'loot-core/platform/client/fetch';
import { type Query } from 'loot-core/shared/query';

import { aqlQuery } from './aqlQuery';

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

type Data<TResponse> = TResponse[];

type Listener<TResponse = unknown> = (
  data: Data<TResponse>,
  previousData: Data<TResponse>,
) => void;

export type LiveQueryOptions = {
  onlySync?: boolean;
};

// Subscribe and refetch
export class LiveQuery<TResponse = unknown> {
  private _unsubscribeSyncEvent: () => void | null;
  private _data: Data<TResponse>;
  private _dependencies: Set<string>;
  private _listeners: Array<Listener<TResponse>>;
  private _supportedSyncTypes: Set<'applied' | 'success'>;
  private _query: Query;
  private _onError?: (error: Error) => void;

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
    this._onError = onError;

    // TODO: error types?
    this._supportedSyncTypes = options.onlySync
      ? new Set(['success'])
      : new Set(['applied', 'success']);

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
    this._onError?.(error);
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
    return this.fetchData(() => aqlQuery(this._query));
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
      this._unsubscribeSyncEvent = listen('sync-event', event => {
        // If the user is doing optimistic updates, they don't want to
        // always refetch whenever something changes because it would
        // refetch all data after they've already updated the UI. This
        // voids the perf benefits of optimistic updates. Allow querys
        // to only react to remote syncs. By default, queries will
        // always update to all changes.
        if (
          (event.type === 'applied' || event.type === 'success') &&
          this._supportedSyncTypes.has(event.type)
        ) {
          this.onUpdate(event.tables);
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
      data: Data<TResponse> | TResponse;
      dependencies: string[];
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

        // For calculate queries, data is a raw value, not an array
        // Convert it to an array format to maintain consistency
        if (this._query.state.calculation) {
          this.data = [data as TResponse];
        } else {
          this.data = data as Data<TResponse>;
        }

        this.onData(this.data, previousData);
        this.inflightRequestId = null;
      }
    } catch (e) {
      console.log('Error fetching data', e);
      this.onError(e);
    }
  };
}
