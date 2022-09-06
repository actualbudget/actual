import * as internals from './encryption-internals';

let uuid = require('../platform/uuid/index.electron.js');

// A map of all possible master encryption keys to use, keyed by
// unique id
let keys = {};

class Key {
  constructor({ id, value }) {
    this.id = id || uuid.v4Sync();
  }

  async createFromPassword({ password, salt }) {
    this.value = await internals.createKey({ secret: password, salt });
  }

  async createFromBase64(str) {
    this.value = await internals.importKey(str);
  }

  getId() {
    return this.id;
  }

  getValue() {
    return this.value;
  }

  serialize() {
    return {
      id: this.id,
      base64: this.value.base64
    };
  }
}

function getKey(keyId) {
  if (keyId == null || keys[keyId] == null) {
    throw new Error('missing-key');
  }
  return keys[keyId];
}

function hasKey(keyId) {
  return keyId in keys;
}

function encrypt(value, keyId) {
  return internals.encrypt(getKey(keyId), value);
}

function decrypt(encrypted, meta) {
  return internals.decrypt(getKey(meta.keyId), encrypted, meta);
}

function randomBytes(n) {
  return internals.randomBytes(n);
}

async function loadKey(key) {
  let keyInstance;
  if (!(key instanceof Key)) {
    keyInstance = new Key({ id: key.id });
    await keyInstance.createFromBase64(key.base64);
  } else {
    keyInstance = key;
  }

  keys[keyInstance.getId()] = keyInstance;
}

function unloadKey(key) {
  delete keys[key.getId()];
}

function unloadAllKeys() {
  keys = {};
}

async function createKey({ id, password, salt }) {
  let key = new Key({ id });
  await key.createFromPassword({ password, salt });
  return key;
}

export default {
  decrypt,
  encrypt,
  randomBytes,
  createKey,
  loadKey,
  getKey,
  hasKey,
  unloadKey,
  unloadAllKeys
};
