import { AutocompleteState, BaseItem } from '../types';
export declare function getActiveItem<TItem extends BaseItem>(state: AutocompleteState<TItem>): {
    item: TItem;
    itemInputValue: string;
    itemUrl: string | undefined;
    source: import("../types").InternalAutocompleteSource<TItem>;
} | null;
