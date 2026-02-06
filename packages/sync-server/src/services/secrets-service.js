import createDebug from 'debug';

import { getAccountDb } from '../account-db';

/**
 * An enum of valid secret names.
 * @readonly
 * @enum {string}
 */
export const SecretName = {
  gocardless_secretId: 'gocardless_secretId',
  gocardless_secretKey: 'gocardless_secretKey',
  simplefin_token: 'simplefin_token',
  simplefin_accessKey: 'simplefin_accessKey',
  pluggyai_clientId: 'pluggyai_clientId',
  pluggyai_clientSecret: 'pluggyai_clientSecret',
  pluggyai_itemIds: 'pluggyai_itemIds',
};

class SecretsDb {
  constructor() {
    this.debug = createDebug('actual:secrets-db');
    this.db = null;
  }

  open() {
    return getAccountDb();
  }

  /**
   * Resolve the file ID from options.
   * @param {Object} options
   * @param {string} options.fileId - The file ID for the secret.
   * @returns {string} The file ID.
   */
  _resolveFileId(options = {}) {
    if (!options.fileId) {
      throw new Error('fileId is required for secret operations');
    }
    return options.fileId;
  }

  set(name, value, options = {}) {
    if (!this.db) {
      this.db = this.open();
    }

    const fileId = this._resolveFileId(options);
    this.debug(`setting secret '${name}' for file '${fileId}' to '${value}'`);
    const result = this.db.mutate(
      `INSERT OR REPLACE INTO secrets (file_id, name, value) VALUES (?,?,?)`,
      [fileId, name, value],
    );
    return result;
  }

  get(name, options = {}) {
    if (!this.db) {
      this.db = this.open();
    }

    const fileId = this._resolveFileId(options);
    this.debug(`getting secret '${name}' for file '${fileId}'`);
    const result = this.db.first(
      `SELECT value FROM secrets WHERE file_id = ? AND name = ?`,
      [fileId, name],
    );
    return result;
  }
}

const secretsDb = new SecretsDb();
const _cachedSecrets = new Map();

/**
 * Create a cache key from file ID and name
 * @param {string} fileId
 * @param {string} name
 * @returns {string}
 */
function _createCacheKey(fileId, name) {
  return `${fileId}:${name}`;
}

/**
 * A service for managing secrets stored in `secretsDb`.
 */
export const secretsService = {
  /**
   * Retrieves the value of a secret by name.
   * @param {SecretName} name - The name of the secret to retrieve.
   * @param {Object} options - Scope configuration.
   * @param {string} options.fileId - The file ID for the secret.
   * @returns {string|null} The value of the secret, or null if the secret does not exist.
   */
  get: (name, options = {}) => {
    const fileId = secretsDb._resolveFileId(options);
    const cacheKey = _createCacheKey(fileId, name);
    return (
      _cachedSecrets.get(cacheKey) ??
      secretsDb.get(name, options)?.value ??
      null
    );
  },

  /**
   * Sets the value of a secret by name.
   * @param {SecretName} name - The name of the secret to set.
   * @param {string} value - The value to set for the secret.
   * @param {Object} options - Scope configuration.
   * @param {string} options.fileId - The file ID for the secret.
   * @returns {Object}
   */
  set: (name, value, options = {}) => {
    const result = secretsDb.set(name, value, options);

    if (result.changes === 1) {
      const fileId = secretsDb._resolveFileId(options);
      const cacheKey = _createCacheKey(fileId, name);
      _cachedSecrets.set(cacheKey, value);
    }
    return result;
  },

  /**
   * Determines whether a secret with the given name exists.
   * @param {SecretName} name - The name of the secret to check for existence.
   * @param {Object} options - Scope configuration.
   * @param {string} options.fileId - The file ID for the secret.
   * @returns {boolean} True if a secret with the given name exists, false otherwise.
   */
  exists: (name, options = {}) => {
    return Boolean(secretsService.get(name, options));
  },
};
