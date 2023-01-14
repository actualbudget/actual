let openedDb = _openDatabase();

// The web version uses IndexedDB to store data
function _openDatabase() {
  return new Promise((resolve, reject) => {
    let dbVersion = 9;
    let openRequest = indexedDB.open('actual', dbVersion);

    openRequest.onupgradeneeded = function (e) {
      let db = e.target.result;

      // Remove old stores
      if (db.objectStoreNames.contains('filesystem')) {
        db.deleteObjectStore('filesystem', { keyPath: 'filepath' });
      }
      if (db.objectStoreNames.contains('messages')) {
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

    openRequest.onerror = event => {
      console.log('openRequest error');
      reject(new Error('indexeddb-failure: Could not open IndexedDB'));
    };

    openRequest.onsuccess = function (e) {
      let db = e.target.result;

      db.onversionchange = () => {
        // TODO: Notify the user somehow
        db.close();
      };

      db.onerror = function (event) {
        console.log('Database error: ' + (event.target && event.target.error));

        if (event.target && event.target.error) {
          let e = event.target.error;
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

function getStore(db, name) {
  let trans = db.transaction([name], 'readwrite');
  return { trans, store: trans.objectStore(name) };
}

async function get(store, key, mapper = x => x) {
  return new Promise((resolve, reject) => {
    let req = store.get(key);
    req.onsuccess = e => {
      resolve(mapper(req.result));
    };
    req.onerror = e => reject(e);
  });
}

async function set(store, item) {
  return new Promise((resolve, reject) => {
    let req = store.put(item);
    req.onsuccess = e => resolve();
    req.onerror = e => reject(e);
  });
}

async function del(store, key) {
  return new Promise((resolve, reject) => {
    let req = store.delete(key);
    req.onsuccess = e => resolve();
    req.onerror = e => reject(e);
  });
}

function getDatabase() {
  return openedDb;
}

function openDatabase() {
  if (openedDb == null) {
    openedDb = _openDatabase();
  }
  return openedDb;
}

function closeDatabase() {
  if (openedDb) {
    openedDb.then(db => {
      db.close();
    });
    openedDb = null;
  }
}

if (process.env.NODE_ENV === 'development') {
  self.addEventListener('message', e => {
    if (e.data.type === '__actual:shutdown') {
      closeDatabase();
    }
  });
}

module.exports = {
  getDatabase,
  openDatabase,
  closeDatabase,
  getStore,
  get,
  set,
  del
};
