import { GlobalPrefs, GlobalPrefsJson } from '../../../types/prefs';

export function init(opts?: { persist?: boolean }): void;
export type Init = typeof init;

type InferType<K extends keyof GlobalPrefsJson> = GlobalPrefs[K];

export function getItem<K extends keyof GlobalPrefsJson>(
  key: K,
): Promise<GlobalPrefsJson[K]>;
export type GetItem = typeof getItem;

export function setItem<K extends keyof GlobalPrefsJson>(
  key: K,
  value: GlobalPrefsJson[K],
): void;
export type SetItem = typeof setItem;

export function removeItem(key: keyof GlobalPrefsJson): void;
export type RemoveItem = typeof removeItem;

export async function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
): Promise<{ [P in keyof K]: [K[P], GlobalPrefsJson[K[P]]] }>;
export type MultiGet = typeof multiGet;

export function multiSet<K extends keyof GlobalPrefsJson>(
  keyValues: Array<[K, GlobalPrefsJson[K]]>,
): void;

export type MultiSet = typeof multiSet;

export function multiRemove(keys: (keyof GlobalPrefsJson)[]): void;
export type MultiRemove = typeof multiRemove;
