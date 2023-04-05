export function getDatabase();
export function openDatabase();
export function closeDatabase();
export function getStore(db: IDBDatabase, name: string);
export function get(store: IDBObjectStore, key: IDBValidKey | IDBKeyRange);
export function set(store: IDBObjectStore, value: unknown);
export function del(store: IDBObjectStore, key: IDBValidKey);
