import { AutocompleteCollection, AutocompleteStore, BaseItem } from './types';
interface GetAutocompleteSettersOptions<TItem extends BaseItem> {
    store: AutocompleteStore<TItem>;
}
export declare function getAutocompleteSetters<TItem extends BaseItem>({ store, }: GetAutocompleteSettersOptions<TItem>): {
    setActiveItemId: import("./types").StateUpdater<number | null>;
    setQuery: import("./types").StateUpdater<string>;
    setCollections: import("./types").StateUpdater<(AutocompleteCollection<TItem> | import("./types").AutocompleteCollectionItemsArray<TItem>)[]>;
    setIsOpen: import("./types").StateUpdater<boolean>;
    setStatus: import("./types").StateUpdater<"idle" | "loading" | "stalled" | "error">;
    setContext: import("./types").StateUpdater<import("./types").AutocompleteContext>;
};
export {};
