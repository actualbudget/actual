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

export async function multiGet<
  K extends ReadonlyArray<keyof GlobalPrefsJson>, // or keyed config
>(
  keys: [...K],
): Promise<{
  [I in keyof K]: [K[I], GlobalPrefsJson[K[I]]];
}>;
export type MultiGet = typeof multiGet;

export function multiSet<K extends keyof GlobalPrefsJson>(
  keyValues: Array<[K, GlobalPrefsJson[K]]>,
): void;

export type MultiSet = typeof multiSet;

export function multiRemove(keys: (keyof GlobalPrefsJson)[]): void;
export type MultiRemove = typeof multiRemove;
