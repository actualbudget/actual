import { BaseItem } from './AutocompleteApi';
import { OnActiveParams, OnSelectParams } from './AutocompleteSource';
export declare type AutocompleteSubscriber<TItem extends BaseItem> = {
    onSelect(params: OnSelectParams<TItem>): void;
    onActive(params: OnActiveParams<TItem>): void;
};
export declare type AutocompleteSubscribers<TItem extends BaseItem> = Array<Partial<AutocompleteSubscriber<TItem>>>;
