import createDebug from 'debug';

import { getAccountDb } from '#account-db';

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
  akahu_userToken: 'akahu_userToken',
  akahu_appToken: 'akahu_appToken',
  enablebanking_applicationId: 'enablebanking_applicationId',
  enablebanking_secretKey: 'enablebanking_secretKey',
};

class SecretsDb {
  constructor() {
    this.debug = createDebug('actual:secrets-db');
    this.db = null;
  }

  open() {
    return getAccountDb();
  }

  set(name, value, fileId = null) {
    if (!this.db) {
      this.db = this.open();
    }

    this.debug(`setting secret '${name}' to '${value}'`);
    return this.db.mutate(
      `INSERT OR REPLACE INTO secrets (name, value, file_id) VALUES (?, ?, ?)`,
      [name, value, fileId],
    );
  }

  get(name, fileId = null) {
    if (!this.db) {
      this.db = this.open();
    }

    this.debug(`getting secret '${name}'`);
    return this.db.first(
      `SELECT value FROM secrets WHERE file_id IS ? AND name = ?`,
      [fileId, name],
    );
  }

  reset(name, fileId = null) {
    if (!this.db) {
      this.db = this.open();
    }

    const result = this.db.mutate(
      `DELETE FROM secrets WHERE file_id IS ? AND name = ?`,
      [fileId, name],
    );
    return {
      ...result,
      deletedFrom: fileId == null ? 'global' : 'per-budget-file',
    };
  }
}

const secretsDb = new SecretsDb();
const _cachedSecrets = new Map();

function _createCacheKey(fileId, name) {
  return fileId == null ? `global:${name}` : `file:${fileId}:${name}`;
}

/**
 * A service for managing secrets stored in `secretsDb`.
 */
export const secretsService = {
  /**
   * Retrieves the active value of a secret by name.
   * @param {SecretName} name - The name of the secret to retrieve.
   * @param {string=} fileId - Budget file ID for this secret.
   * @returns {string|null} The value of the secret, or null if the secret does not exist.
   */
  get: (name, fileId = null) => {
    const value =
      _cachedSecrets.get(_createCacheKey(fileId, name)) ??
      secretsDb.get(name, fileId)?.value ??
      null;

    return value;
  },

  /**
   * Sets the value of a secret by name.
   * @param {SecretName} name - The name of the secret to set.
   * @param {string} value - The value to set for the secret.
   * @param {string=} fileId - Budget file ID for this secret.
   * @returns {Object}
   */
  set: (name, value, fileId = null) => {
    const result = secretsDb.set(name, value, fileId);

    if (result.changes === 1) {
      _cachedSecrets.set(_createCacheKey(fileId, name), value);
    }
    return result;
  },

  reset: (name, fileId = null) => {
    const result = secretsDb.reset(name, fileId);
    _cachedSecrets.delete(_createCacheKey(fileId, name));
    return result;
  },

  /**
   * Determines whether a secret with the given name exists.
   * @param {SecretName} name - The name of the secret to check for existence.
   * @param {string=} fileId - Budget file ID for this secret.
   * @returns {boolean} True if a secret with the given name exists, false otherwise.
   */
  exists: (name, fileId = null) => {
    return Boolean(secretsService.get(name, fileId));
  },
};
