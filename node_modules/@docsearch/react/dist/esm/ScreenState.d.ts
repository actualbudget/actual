import type { AutocompleteApi, AutocompleteState, BaseItem } from '@algolia/autocomplete-core';
import React from 'react';
import type { DocSearchProps } from './DocSearch';
import type { ErrorScreenTranslations } from './ErrorScreen';
import type { NoResultsScreenTranslations } from './NoResultsScreen';
import type { StartScreenTranslations } from './StartScreen';
import type { StoredSearchPlugin } from './stored-searches';
import type { InternalDocSearchHit, StoredDocSearchHit } from './types';
export declare type ScreenStateTranslations = Partial<{
    errorScreen: ErrorScreenTranslations;
    startScreen: StartScreenTranslations;
    noResultsScreen: NoResultsScreenTranslations;
}>;
export interface ScreenStateProps<TItem extends BaseItem> extends AutocompleteApi<TItem, React.FormEvent, React.MouseEvent, React.KeyboardEvent> {
    state: AutocompleteState<TItem>;
    recentSearches: StoredSearchPlugin<StoredDocSearchHit>;
    favoriteSearches: StoredSearchPlugin<StoredDocSearchHit>;
    onItemClick: (item: InternalDocSearchHit) => void;
    inputRef: React.MutableRefObject<HTMLInputElement | null>;
    hitComponent: DocSearchProps['hitComponent'];
    indexName: DocSearchProps['indexName'];
    disableUserPersonalization: boolean;
    resultsFooterComponent: DocSearchProps['resultsFooterComponent'];
    translations: ScreenStateTranslations;
    getMissingResultsUrl?: DocSearchProps['getMissingResultsUrl'];
}
export declare const ScreenState: React.MemoExoticComponent<({ translations, ...props }: ScreenStateProps<InternalDocSearchHit>) => JSX.Element>;
