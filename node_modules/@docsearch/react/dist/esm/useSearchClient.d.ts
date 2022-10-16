import type { SearchClient } from 'algoliasearch/lite';
export declare function useSearchClient(appId: string, apiKey: string, transformSearchClient: (searchClient: SearchClient) => SearchClient): SearchClient;
