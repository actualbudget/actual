// Note: Below, we will be importing all algoliasearch v3,4,5 types.
// The goal is being able to export the algoliasearch-helper types using
// the version of the client installed by the developer.

// @ts-ignore
import type algoliasearch from 'algoliasearch/lite';
// @ts-ignore
import type * as AlgoliaSearchLite from 'algoliasearch/lite';
// @ts-ignore
import type * as AlgoliaSearch from 'algoliasearch';
// @ts-ignore
import type * as ClientSearch from '@algolia/client-search';

// turns any to unknown, so it can be used as a conditional
type AnyToUnknown<T> = (any extends T ? true : false) extends true
  ? unknown
  : T;

type SearchClientV4Shape = {
  transporter: unknown;
};

type SearchClientShape = {
  search: unknown;
};

// @ts-ignore
type ClientV3_4 = ReturnType<typeof algoliasearch>;

type ClientLiteV5 = AnyToUnknown<
  // @ts-ignore
  ReturnType<typeof AlgoliaSearchLite.liteClient>
>;
type ClientFullV5 = AnyToUnknown<
  // @ts-ignore
  ReturnType<typeof AlgoliaSearch.algoliasearch>
>;
type ClientSearchV5 = AnyToUnknown<
  // @ts-ignore
  ReturnType<typeof ClientSearch.searchClient>
>;
type ClientV5 = ClientLiteV5 extends SearchClientShape
  ? ClientLiteV5
  : ClientSearchV5 extends SearchClientShape
  ? ClientSearchV5
  : ClientFullV5 extends SearchClientShape
  ? ClientFullV5
  : unknown;

type PickForClient<
  T extends {
    v3: unknown;
    v4: unknown;
    v5: unknown;
  }
> = ClientV5 extends SearchClientShape
  ? T['v5']
  : // @ts-ignore
  ClientV3_4 extends SearchClientV4Shape
  ? T['v4']
  : T['v3'];

type DefaultSearchClient = PickForClient<{
  v3: ClientV3_4;
  v4: ClientV3_4;
  v5: ClientV5;
}>;

export type HighlightResult<T> = PickForClient<{
  // @ts-ignore this doesn't exist as an exact type in v3
  v3: any;
  // @ts-ignore
  v4: ClientSearch.HighlightResult<T>;
  // @ts-ignore the type in the v5 library is not yet correct https://github.com/algolia/api-clients-automation/issues/853
  v5: any;
}>;

export type SnippetResult<T> = PickForClient<{
  // @ts-ignore this doesn't exist as an exact type in v3
  v3: any;
  // @ts-ignore
  v4: ClientSearch.SnippetResult<T>;
  // @ts-ignore the type in the v5 library is not yet correct https://github.com/algolia/api-clients-automation/issues/853
  v5: any;
}>;

export type RankingInfo = PickForClient<{
  v3: Record<string, unknown>;
  // @ts-ignore
  v4: ClientSearch.RankingInfo;
  // @ts-ignore
  v5: AlgoliaSearch.RankingInfo;
}>;

export type SearchOptions = PickForClient<{
  // @ts-ignore
  v3: AlgoliaSearch.QueryParameters;
  // @ts-ignore
  v4: ClientSearch.SearchOptions;
  v5: NonNullable<
    // @ts-ignore
    AlgoliaSearch.LegacySearchMethodProps[number]['params']
  >;
}>;

export type SearchResponse<T> = PickForClient<{
  // @ts-ignore
  v3: AlgoliaSearch.Response<T> & {
    appliedRelevancyStrictness?: number;
    nbSortedHits?: number;
    renderingContent?: {
      facetOrdering?: {
        facets?: {
          order?: string[];
        };
        values?: {
          [facet: string]: {
            order?: string[];
            sortRemainingBy?: 'count' | 'alpha' | 'hidden';
          };
        };
      };
    };
  };
  // @ts-ignore
  v4: ClientSearch.SearchResponse<T>;
  // @ts-ignore
  v5: AlgoliaSearch.SearchResponse; // TODO: should be generic https://github.com/algolia/api-clients-automation/issues/853
}>;

export type SearchResponses<T> = PickForClient<{
  // @ts-ignore
  v3: AlgoliaSearch.MultiResponse<T>;
  // @ts-ignore
  v4: ClientSearch.MultipleQueriesResponse<T>;
  // @ts-ignore
  v5: AlgoliaSearch.SearchResponses; // TODO: should be generic https://github.com/algolia/api-clients-automation/issues/853
}>;

export type SearchForFacetValuesResponse = PickForClient<{
  // @ts-ignore
  v3: AlgoliaSearch.SearchForFacetValues.Response;
  // @ts-ignore
  v4: ClientSearch.SearchForFacetValuesResponse;
  // @ts-ignore
  v5: AlgoliaSearch.SearchForFacetValuesResponse;
}>;

export type FindAnswersOptions = PickForClient<{
  v3: any; // answers only exists in v4
  // @ts-ignore
  v4: ClientSearch.FindAnswersOptions;
  v5: any; // answers only exists in v4
}>;

export type FindAnswersResponse<T> = PickForClient<{
  v3: any; // answers only exists in v4
  // @ts-ignore
  v4: ClientSearch.FindAnswersResponse<T>;
  v5: any; // answers only exists in v4
}>;

export interface SearchClient {
  search: DefaultSearchClient['search'];
  searchForFacetValues?: DefaultSearchClient extends {
    searchForFacetValues: unknown;
  }
    ? DefaultSearchClient['searchForFacetValues']
    : never;
  initIndex?: DefaultSearchClient extends { initIndex: unknown }
    ? DefaultSearchClient['initIndex']
    : never;
  addAlgoliaAgent?: DefaultSearchClient['addAlgoliaAgent'];
}
