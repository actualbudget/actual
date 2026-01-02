import { logger } from '../log';

let openedDb: null | ReturnType<typeof _openDatabase> = _openDatabase();

// The web version uses IndexedDB to store data
function _openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const dbVersion = 9;
    const openRequest = indexedDB.open('actual', dbVersion);

    openRequest.onupgradeneeded = function (e) {
      const db = (e.target as IDBOpenDBRequest).result;

      // Remove old stores
      if (db.objectStoreNames.contains('filesystem')) {
        db.deleteObjectStore('filesystem');
      }
      if (db.objectStoreNames.contains('messages')) {
        db.deleteObjectStore('messages');
      }

      // Create new stores
      if (!db.objectStoreNames.contains('asyncStorage')) {
        db.createObjectStore('asyncStorage');
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'filepath' });
      }
    };

    openRequest.onblocked = e => logger.log('blocked', e);

    openRequest.onerror = () => {
      logger.log('openRequest error');
      reject(new Error('indexeddb-failure: Could not open IndexedDB'));
    };

    openRequest.onsuccess = function (e) {
      const db = (e.target as IDBOpenDBRequest).result;

      db.onversionchange = () => {
        // TODO: Notify the user somehow
        db.close();
      };

      db.onerror = function (event) {
        const error = (event.target as IDBOpenDBRequest)?.error;
        logger.log('Database error: ' + error);

        if (event.target && error) {
          if (error.name === 'QuotaExceededError') {
            throw new Error('indexeddb-quota-error');
          }
        }
      };
      resolve(db);
    };
  });
}

type Data = { filepath: string; contents: string };

export const getStore = function (db: IDBDatabase, name: string) {
  const trans = db.transaction([name], 'readwrite');
  return { trans, store: trans.objectStore(name) };
};

export const get = async function (
  store: IDBObjectStore,
  key: IDBValidKey | IDBKeyRange,
) {
  return new Promise<Data>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = e => reject(e);
  });
};

export const set = async function (store: IDBObjectStore, item: Data) {
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve(undefined);
    req.onerror = e => reject(e);
  });
};

export const del = async function (store: IDBObjectStore, key: string) {
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve(undefined);
    req.onerror = e => reject(e);
  });
};

export const getDatabase = function () {
  return openedDb;
};

export const openDatabase = function () {
  if (openedDb == null) {
    openedDb = _openDatabase();
  }
  return openedDb;
};

export const closeDatabase = function () {
  if (openedDb) {
    openedDb.then(db => {
      db.close();
    });
    openedDb = null;
  }
};
