// @ts-strict-ignore
import type * as T from '.';

let openedDb = _openDatabase();

// The web version uses IndexedDB to store data
function _openDatabase() {
  return new Promise((resolve, reject) => {
    const dbVersion = 9;
    const openRequest = indexedDB.open('actual', dbVersion);

    openRequest.onupgradeneeded = function (e) {
      // @ts-expect-error EventTarget needs refinement
      const db: IDBDatabase = e.target.result;

      // Remove old stores
      if (db.objectStoreNames.contains('filesystem')) {
        // @ts-expect-error deleteObjectStore does not seem to accept options
        db.deleteObjectStore('filesystem', { keyPath: 'filepath' });
      }
      if (db.objectStoreNames.contains('messages')) {
        // @ts-expect-error deleteObjectStore does not seem to accept options
        db.deleteObjectStore('messages', { keyPath: 'filepath' });
      }

      // Create new stores
      if (!db.objectStoreNames.contains('asyncStorage')) {
        db.createObjectStore('asyncStorage');
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'filepath' });
      }
    };

    openRequest.onblocked = e => console.log('blocked', e);

    openRequest.onerror = () => {
      console.log('openRequest error');
      reject(new Error('indexeddb-failure: Could not open IndexedDB'));
    };

    openRequest.onsuccess = function (e) {
      // @ts-expect-error EventTarget needs refinement
      const db = e.target.result;

      db.onversionchange = () => {
        // TODO: Notify the user somehow
        db.close();
      };

      db.onerror = function (event) {
        console.log('Database error: ' + (event.target && event.target.error));

        if (event.target && event.target.error) {
          const e = event.target.error;
          if (e.name === 'QuotaExceededError') {
            // Don't try to get the sized used -- too brittle. Is there
            // a better way to do it?
            //
            // async function run() {
            //   let transaction = db.transaction(['asyncStorage'], 'readonly');
            //   let objectStore = transaction.objectStore('filesystem');

            //   let files = await new Promise((resolve, reject) => {
            //     let req = objectStore.getAll();
            //     req.onerror = e => reject(e);
            //     req.onsuccess = e => resolve(e.target.result);
            //   });

            //   console.log('files', files.length);
            //   for (let file of files) {
            //     console.log(file.filepath, file.contents.length);
            //   }

            //   transaction = db.transaction(['files'], 'readonly');
            //   objectStore = transaction.objectStore('messages');

            //   let messages = await new Promise((resolve, reject) => {
            //     let req = objectStore.getAll();
            //     req.onerror = e => reject(e);
            //     req.onsuccess = e => resolve(e.target.result);
            //   });

            //   console.log('messages', messages.length);
            //   console.log('message bytes', JSON.stringify(messages).length);
            // }

            throw new Error('indexeddb-quota-error');
          }
        }
      };
      resolve(db);
    };
  });
}

export const getStore: T.GetStore = function (db, name) {
  const trans = db.transaction([name], 'readwrite');
  return { trans, store: trans.objectStore(name) };
};

export const get: T.Get = async function (store, key, mapper = x => x) {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => {
      resolve(mapper(req.result));
    };
    req.onerror = e => reject(e);
  });
};

export const set: T.Set = async function (store, item) {
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve(undefined);
    req.onerror = e => reject(e);
  });
};

export const del: T.Del = async function (store, key) {
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve(undefined);
    req.onerror = e => reject(e);
  });
};

export const getDatabase: T.GetDatabase = function () {
  return openedDb;
};

export const openDatabase: T.OpenDatabase = function () {
  if (openedDb == null) {
    openedDb = _openDatabase();
  }
  return openedDb;
};

export const closeDatabase: T.CloseDatabase = function () {
  if (openedDb) {
    openedDb.then(db => {
      // @ts-expect-error db type needs refinement
      db.close();
    });
    openedDb = null;
  }
};
