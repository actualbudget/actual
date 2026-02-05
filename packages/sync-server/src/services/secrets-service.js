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
   * Compute the scope string from options
   * @param {Object} options
   * @param {string} [options.fileId] - Optional file ID for file-scoped secrets
   * @returns {string} The scope string ('global' or 'file:<fileId>')
   */
  _computeScope(options = {}) {
    return options.fileId ? `file:${options.fileId}` : 'global';
  }

  set(name, value, options = {}) {
    if (!this.db) {
      this.db = this.open();
    }

    const scope = this._computeScope(options);
    this.debug(`setting secret '${name}' in scope '${scope}' to '${value}'`);
    const result = this.db.mutate(
      `INSERT OR REPLACE INTO secrets (scope, name, value) VALUES (?,?,?)`,
      [scope, name, value],
    );
    return result;
  }

  get(name, options = {}) {
    if (!this.db) {
      this.db = this.open();
    }

    const scope = this._computeScope(options);
    this.debug(`getting secret '${name}' from scope '${scope}'`);
    const result = this.db.first(
      `SELECT value FROM secrets WHERE scope = ? AND name = ?`,
      [scope, name],
    );
    return result;
  }
}

const secretsDb = new SecretsDb();
const _cachedSecrets = new Map();

/**
 * Create a cache key from scope and name
 * @param {string} scope
 * @param {string} name
 * @returns {string}
 */
function _createCacheKey(scope, name) {
  return `${scope}:${name}`;
}

/**
 * A service for managing secrets stored in `secretsDb`.
 */
export const secretsService = {
  /**
   * Retrieves the value of a secret by name.
   * @param {SecretName} name - The name of the secret to retrieve.
   * @param {Object} [options] - Optional scope configuration.
   * @param {string} [options.fileId] - Optional file ID for file-scoped secrets.
   * @returns {string|null} The value of the secret, or null if the secret does not exist.
   */
  get: (name, options = {}) => {
    const scope = secretsDb._computeScope(options);
    const cacheKey = _createCacheKey(scope, name);
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
   * @param {Object} [options] - Optional scope configuration.
   * @param {string} [options.fileId] - Optional file ID for file-scoped secrets.
   * @returns {Object}
   */
  set: (name, value, options = {}) => {
    const result = secretsDb.set(name, value, options);

    if (result.changes === 1) {
      const scope = secretsDb._computeScope(options);
      const cacheKey = _createCacheKey(scope, name);
      _cachedSecrets.set(cacheKey, value);
    }
    return result;
  },

  /**
   * Determines whether a secret with the given name exists.
   * @param {SecretName} name - The name of the secret to check for existence.
   * @param {Object} [options] - Optional scope configuration.
   * @param {string} [options.fileId] - Optional file ID for file-scoped secrets.
   * @returns {boolean} True if a secret with the given name exists, false otherwise.
   */
  exists: (name, options = {}) => {
    return Boolean(secretsService.get(name, options));
  },
};
