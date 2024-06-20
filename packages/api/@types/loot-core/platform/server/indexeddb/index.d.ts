export function getDatabase();
export type GetDatabase = typeof getDatabase;

export function openDatabase();
export type OpenDatabase = typeof openDatabase;

export function closeDatabase();
export type CloseDatabase = typeof closeDatabase;

export function getStore(db: IDBDatabase, name: string);
export type GetStore = typeof getStore;

export function get(
  store: IDBObjectStore,
  key: IDBValidKey | IDBKeyRange,
  mapper?: (v: unknown) => unknown,
);
export type Get = typeof get;

export function set(store: IDBObjectStore, value: unknown);
export type Set = typeof set;

export function del(store: IDBObjectStore, key: IDBValidKey);
export type Del = typeof del;
