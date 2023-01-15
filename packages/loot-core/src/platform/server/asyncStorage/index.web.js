let { getDatabase, closeDatabase } = require('../indexeddb');

function init() {}

function shutdown() {
  closeDatabase();
}

function commit(trans) {
  if (trans.commit) {
    trans.commit();
  }
}

async function getItem(key) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readonly');
  let objectStore = transaction.objectStore('asyncStorage');

  return new Promise((resolve, reject) => {
    let req = objectStore.get(key);
    req.onerror = e => reject(e);
    req.onsuccess = e => resolve(e.target.result);
    commit(transaction);
  });
}

async function setItem(key, value) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readwrite');
  let objectStore = transaction.objectStore('asyncStorage');

  new Promise((resolve, reject) => {
    let req = objectStore.put(value, key);
    req.onerror = e => reject(e);
    req.onsuccess = e => resolve();
    commit(transaction);
  });
}

async function removeItem(key) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readwrite');
  let objectStore = transaction.objectStore('asyncStorage');

  return new Promise((resolve, reject) => {
    let req = objectStore.delete(key);
    req.onerror = e => reject(e);
    req.onsuccess = e => resolve();
    commit(transaction);
  });
}

async function multiGet(keys) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readonly');
  let objectStore = transaction.objectStore('asyncStorage');

  let promise = Promise.all(
    keys.map(key => {
      return new Promise((resolve, reject) => {
        let req = objectStore.get(key);
        req.onerror = e => reject(e);
        req.onsuccess = e => resolve([key, e.target.result]);
      });
    })
  );

  commit(transaction);
  return promise;
}

async function multiSet(keyValues) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readwrite');
  let objectStore = transaction.objectStore('asyncStorage');

  let promise = Promise.all(
    keyValues.map(([key, value]) => {
      return new Promise((resolve, reject) => {
        let req = objectStore.put(value, key);
        req.onerror = e => reject(e);
        req.onsuccess = e => resolve();
      });
    })
  );

  commit(transaction);
  return promise;
}

async function multiRemove(keys) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readwrite');
  let objectStore = transaction.objectStore('asyncStorage');

  let promise = Promise.all(
    keys.map(key => {
      return new Promise((resolve, reject) => {
        let req = objectStore.delete(key);
        req.onerror = e => reject(e);
        req.onsuccess = e => resolve();
      });
    })
  );

  commit(transaction);
  return promise;
}

module.exports = {
  init,
  shutdown,
  getItem,
  setItem,
  removeItem,
  multiGet,
  multiSet,
  multiRemove
};
