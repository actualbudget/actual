import { GlobalPrefs } from 'loot-core/types/prefs';

interface ConfigMap {
  'user-id'?: string;
  'user-key'?: string;
  'encrypt-keys'?: string;
  lastBudget?: string;
  readOnly?: string;
  'server-url'?: string;
  'did-bootstrap'?: boolean;
  'user-token'?: string;
  'floating-sidebar'?: GlobalPrefs['floatingSidebar'];
  'max-months'?: GlobalPrefs['maxMonths'];
  'document-dir'?: GlobalPrefs['documentDir'];
  'encrypt-key'?: string;
  language?: GlobalPrefs['language'];
  theme?: GlobalPrefs['theme'];
  'preferred-dark-theme'?: GlobalPrefs['preferredDarkTheme'];
  'server-self-signed-cert'?: GlobalPrefs['serverSelfSignedCert'];
  ngrokConfig?: GlobalPrefs['ngrokConfig'];
}

export function init(opts?: { persist?: boolean }): void;
export type Init = typeof init;

type InferType<K extends keyof ConfigMap> = GlobalPrefs[K];

export function getItem<K extends keyof ConfigMap>(
  key: K,
): Promise<ConfigMap[K]>;
export type GetItem = typeof getItem;

export function setItem<K extends keyof ConfigMap>(
  key: K,
  value: ConfigMap[K],
): void;
export type SetItem = typeof setItem;

export function removeItem(key: keyof ConfigMap): void;
export type RemoveItem = typeof removeItem;

export async function multiGet<
  K extends ReadonlyArray<keyof ConfigMap>, // or keyed config
>(
  keys: [...K],
): Promise<{
  [I in keyof K]: [K[I], ConfigMap[K[I]]];
}>;
export type MultiGet = typeof multiGet;

export function multiSet<K extends keyof ConfigMap>(
  keyValues: Array<[K, ConfigMap[K]]>,
): void;

export type MultiSet = typeof multiSet;

export function multiRemove(keys: (keyof ConfigMap)[]): void;
export type MultiRemove = typeof multiRemove;
