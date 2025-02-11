export function init(opts?: { persist?: boolean }): void;
export type Init = typeof init;

export function getItem<T = string>(key: string): Promise<T>;
export type GetItem = typeof getItem;

export function setItem(key: string, value: unknown): void;
export type SetItem = typeof setItem;

export function removeItem(key: string): void;
export type RemoveItem = typeof removeItem;

export function multiGet(keys: string[]): Promise<[string, unknown][]>;
export type MultiGet = typeof multiGet;

export function multiSet(keyValues: [string, unknown][]): void;
export type MultiSet = typeof multiSet;

export function multiRemove(keys: string[]): void;
export type MultiRemove = typeof multiRemove;
