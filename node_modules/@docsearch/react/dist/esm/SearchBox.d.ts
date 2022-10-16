import type { AutocompleteApi, AutocompleteState } from '@algolia/autocomplete-core';
import type { MutableRefObject } from 'react';
import React from 'react';
import type { InternalDocSearchHit } from './types';
export declare type SearchBoxTranslations = Partial<{
    resetButtonTitle: string;
    resetButtonAriaLabel: string;
    cancelButtonText: string;
    cancelButtonAriaLabel: string;
}>;
interface SearchBoxProps extends AutocompleteApi<InternalDocSearchHit, React.FormEvent, React.MouseEvent, React.KeyboardEvent> {
    state: AutocompleteState<InternalDocSearchHit>;
    autoFocus: boolean;
    inputRef: MutableRefObject<HTMLInputElement | null>;
    onClose: () => void;
    isFromSelection: boolean;
    translations?: SearchBoxTranslations;
}
export declare function SearchBox({ translations, ...props }: SearchBoxProps): JSX.Element;
export {};
