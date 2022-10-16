import type { SearchForFacetValuesResponse, SearchResponse } from '@algolia/client-search';
export declare function mapToAlgoliaResponse<THit>(rawResults: Array<SearchResponse<THit> | SearchForFacetValuesResponse>): {
    results: (SearchForFacetValuesResponse | SearchResponse<THit>)[];
    hits: import("@algolia/client-search").Hit<THit>[][];
    facetHits: {
        label: string;
        count: number;
        _highlightResult: {
            label: {
                value: string;
            };
        };
    }[][];
};
