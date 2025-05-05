// @ts-strict-ignore
import { once } from 'loot-core/shared/async';
import { getPrimaryOrderBy, type Query } from 'loot-core/shared/query';

import { aqlQuery } from './aqlQuery';
import { LiveQuery, type LiveQueryOptions } from './liveQuery';

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

type Data<TResponse> = TResponse[];

type Listener<TResponse = unknown> = (
  data: Data<TResponse>,
  previousData: Data<TResponse>,
) => void;

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
    return aqlQuery(this.query.calculate({ $count: '*' })).then(({ data }) => {
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
      return aqlQuery(
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

      let result = await aqlQuery(this.query.filter({ id }).select(field));
      if (result.data.length === 0) {
        // This row is not part of this set anymore, we can't do
        // this. We stop early to avoid possibly pulling in a ton of
        // data that we don't need
        return;
      }
      const fullRow = result.data[0];

      result = await aqlQuery(
        this.query.filter({
          [field]: {
            [order === 'asc' ? '$lte' : '$gte']: fullRow[field],
          },
        }),
      );
      const data = result.data;

      // Load in an extra page to make room for the UI to show some
      // data after it
      result = await aqlQuery(
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
      const { data } = await aqlQuery(
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
