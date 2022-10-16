import type { StoredDocSearchHit } from './types';
declare type CreateStoredSearchesOptions = {
    key: string;
    limit?: number;
};
export declare type StoredSearchPlugin<TItem> = {
    add: (item: TItem) => void;
    remove: (item: TItem) => void;
    getAll: () => TItem[];
};
export declare function createStoredSearches<TItem extends StoredDocSearchHit>({ key, limit, }: CreateStoredSearchesOptions): StoredSearchPlugin<TItem>;
export {};
