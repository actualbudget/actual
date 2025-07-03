import type { GlobalPrefsJson } from '../../../types/prefs';

export declare function init(opts?: { persist?: boolean }): void;
export type Init = typeof init;

export declare function getItem<K extends keyof GlobalPrefsJson>(
  key: K,
): Promise<GlobalPrefsJson[K]>;
export type GetItem = typeof getItem;

export declare function setItem<K extends keyof GlobalPrefsJson>(
  key: K,
  value: GlobalPrefsJson[K],
): Promise<void>;
export type SetItem = typeof setItem;

export declare function removeItem(key: keyof GlobalPrefsJson): Promise<void>;
export type RemoveItem = typeof removeItem;

export declare function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
): Promise<{ [P in K[number]]: GlobalPrefsJson[P] }>;

export type MultiGet = typeof multiGet;

export declare function multiSet<K extends keyof GlobalPrefsJson>(
  keyValues: Array<[K, GlobalPrefsJson[K]]>,
): Promise<void>;

export type MultiSet = typeof multiSet;

export declare function multiRemove(
  keys: (keyof GlobalPrefsJson)[],
): Promise<void>;
export type MultiRemove = typeof multiRemove;
