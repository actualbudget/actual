import type { AutocompleteState, AutocompleteOptions } from '@algolia/autocomplete-core';
import type { SearchOptions } from '@algolia/client-search';
import type { SearchClient } from 'algoliasearch/lite';
import React from 'react';
import type { DocSearchHit, InternalDocSearchHit, StoredDocSearchHit } from './types';
import type { ButtonTranslations, ModalTranslations } from '.';
export declare type DocSearchTranslations = Partial<{
    button: ButtonTranslations;
    modal: ModalTranslations;
}>;
export interface DocSearchProps {
    appId: string;
    apiKey: string;
    indexName: string;
    placeholder?: string;
    searchParameters?: SearchOptions;
    transformItems?: (items: DocSearchHit[]) => DocSearchHit[];
    hitComponent?: (props: {
        hit: InternalDocSearchHit | StoredDocSearchHit;
        children: React.ReactNode;
    }) => JSX.Element;
    resultsFooterComponent?: (props: {
        state: AutocompleteState<InternalDocSearchHit>;
    }) => JSX.Element | null;
    transformSearchClient?: (searchClient: SearchClient) => SearchClient;
    disableUserPersonalization?: boolean;
    initialQuery?: string;
    navigator?: AutocompleteOptions<InternalDocSearchHit>['navigator'];
    translations?: DocSearchTranslations;
    getMissingResultsUrl?: ({ query: string }: {
        query: any;
    }) => string;
}
export declare function DocSearch(props: DocSearchProps): JSX.Element;
