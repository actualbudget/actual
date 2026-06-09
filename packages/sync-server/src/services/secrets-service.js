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

  _requireFileId(options = {}) {
    if (!options.fileId) {
      throw new Error('missing-file-id');
    }
    return options.fileId;
  }

  setGlobal(name, value) {
    if (!this.db) {
      this.db = this.open();
    }

    this.debug(`setting global secret '${name}'`);
    this.db.mutate(`DELETE FROM secrets WHERE file_id IS NULL AND name = ?`, [
      name,
    ]);
    return this.db.mutate(
      `INSERT INTO secrets (name, value, file_id) VALUES (?, ?, NULL)`,
      [name, value],
    );
  }

  setPerBudgetFile(name, value, options = {}) {
    if (!this.db) {
      this.db = this.open();
    }

    const fileId = this._requireFileId(options);
    this.debug(`setting secret '${name}' for file '${fileId}'`);
    this.db.mutate(`DELETE FROM secrets WHERE file_id = ? AND name = ?`, [
      fileId,
      name,
    ]);
    return this.db.mutate(
      `INSERT INTO secrets (name, value, file_id) VALUES (?, ?, ?)`,
      [name, value, fileId],
    );
  }

  getGlobal(name) {
    if (!this.db) {
      this.db = this.open();
    }

    this.debug(`getting global secret '${name}'`);
    return this.db.first(
      `SELECT value FROM secrets WHERE file_id IS NULL AND name = ?`,
      [name],
    );
  }

  getPerBudgetFile(name, options = {}) {
    if (!this.db) {
      this.db = this.open();
    }

    const fileId = this._requireFileId(options);
    this.debug(`getting secret '${name}' for file '${fileId}'`);
    return this.db.first(
      `SELECT value FROM secrets WHERE file_id = ? AND name = ?`,
      [fileId, name],
    );
  }

  reset(name, options = {}) {
    if (!this.db) {
      this.db = this.open();
    }

    const fileId = this._requireFileId(options);
    const perBudgetResult = this.db.mutate(
      `DELETE FROM secrets WHERE file_id = ? AND name = ?`,
      [fileId, name],
    );

    if (perBudgetResult.changes > 0) {
      return { ...perBudgetResult, deletedFrom: 'per-budget-file' };
    }

    const globalResult = this.db.mutate(
      `DELETE FROM secrets WHERE file_id IS NULL AND name = ?`,
      [name],
    );
    return { ...globalResult, deletedFrom: 'global' };
  }

  resetPerBudgetFile(name, options = {}) {
    if (!this.db) {
      this.db = this.open();
    }

    const fileId = this._requireFileId(options);
    const result = this.db.mutate(
      `DELETE FROM secrets WHERE file_id = ? AND name = ?`,
      [fileId, name],
    );
    return { ...result, deletedFrom: 'per-budget-file' };
  }
}

const secretsDb = new SecretsDb();
const _cachedSecrets = new Map();

/**
 * Create a cache key from source and name
 * @param {string|null} fileId
 * @param {string} name
 * @returns {string}
 */
function _createCacheKey(fileId, name) {
  return fileId == null ? `global:${name}` : `file:${fileId}:${name}`;
}

function _clearCache(name, fileId) {
  _cachedSecrets.delete(_createCacheKey(null, name));
  if (fileId != null) {
    _cachedSecrets.delete(_createCacheKey(fileId, name));
  }
}

/**
 * A service for managing secrets stored in `secretsDb`.
 */
export const secretsService = {
  /**
   * Retrieves the active value of a secret by name.
   * @param {SecretName} name - The name of the secret to retrieve.
   * @param {Object} options
   * @param {string} options.fileId - Budget file ID for this secret.
   * @returns {string|null} The value of the secret, or null if the secret does not exist.
   */
  get: (name, options = {}) => {
    return (
      secretsService.getPerBudgetFile(name, options) ??
      secretsService.getGlobal(name)
    );
  },

  getPerBudgetFile: (name, options = {}) => {
    const fileId = secretsDb._requireFileId(options);
    const cacheKey = _createCacheKey(fileId, name);
    if (_cachedSecrets.has(cacheKey)) {
      return _cachedSecrets.get(cacheKey);
    }

    const value = secretsDb.getPerBudgetFile(name, options)?.value ?? null;
    if (value != null) {
      _cachedSecrets.set(cacheKey, value);
    }
    return value;
  },

  getGlobal: name => {
    const cacheKey = _createCacheKey(null, name);
    if (_cachedSecrets.has(cacheKey)) {
      return _cachedSecrets.get(cacheKey);
    }

    const value = secretsDb.getGlobal(name)?.value ?? null;
    if (value != null) {
      _cachedSecrets.set(cacheKey, value);
    }
    return value;
  },

  getSource: (name, options = {}) => {
    if (secretsService.getPerBudgetFile(name, options) != null) {
      return 'per-budget-file';
    }

    if (secretsService.getGlobal(name) != null) {
      return 'global';
    }

    return null;
  },

  getCredentialSource: (names, options = {}) => {
    const hasPerBudgetFileCredentials = names.every(
      name => secretsService.getPerBudgetFile(name, options) != null,
    );
    if (hasPerBudgetFileCredentials) {
      return 'per-budget-file';
    }

    const hasGlobalCredentials = names.every(
      name => secretsService.getGlobal(name) != null,
    );
    if (hasGlobalCredentials) {
      return 'global';
    }

    return null;
  },

  /**
   * Sets the value of a secret by name.
   * @param {SecretName} name - The name of the secret to set.
   * @param {string} value - The value to set for the secret.
   * @param {Object} options
   * @param {string} options.fileId - Budget file ID for this secret.
   * @param {boolean} options.perBudgetFile - Whether to save this secret for only the budget file.
   * @returns {Object}
   */
  set: (name, value, options = {}) => {
    const perBudgetFile = options.perBudgetFile !== false;
    const result = perBudgetFile
      ? secretsDb.setPerBudgetFile(name, value, options)
      : secretsDb.setGlobal(name, value);

    if (result.changes === 1) {
      const fileId = perBudgetFile ? secretsDb._requireFileId(options) : null;
      const cacheKey = _createCacheKey(fileId, name);
      _cachedSecrets.set(cacheKey, value);
    }
    return result;
  },

  reset: (name, options = {}) => {
    const fileId = secretsDb._requireFileId(options);
    const result = secretsDb.reset(name, options);
    _clearCache(name, fileId);
    return result;
  },

  resetPerBudgetFile: (name, options = {}) => {
    const fileId = secretsDb._requireFileId(options);
    const result = secretsDb.resetPerBudgetFile(name, options);
    _cachedSecrets.delete(_createCacheKey(fileId, name));
    return result;
  },

  /**
   * Determines whether a secret with the given name exists.
   * @param {SecretName} name - The name of the secret to check for existence.
   * @param {Object} options
   * @param {string} options.fileId - Budget file ID for this secret.
   * @returns {boolean} True if a secret with the given name exists, false otherwise.
   */
  exists: (name, options = {}) => {
    return Boolean(secretsService.get(name, options));
  },
};
