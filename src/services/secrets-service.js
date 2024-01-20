import createDebug from 'debug';
import getAccountDb from '../account-db.js';

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
};

class SecretsDb {
  constructor() {
    this.debug = createDebug('actual:secrets-db');
    this.db = null;
  }

  open() {
    return getAccountDb();
  }

  set(name, value) {
    if (!this.db) {
      this.db = this.open();
    }

    this.debug(`setting secret '${name}' to '${value}'`);
    const result = this.db.mutate(
      `INSERT OR REPLACE INTO secrets (name, value) VALUES (?,?)`,
      [name, value],
    );
    return result;
  }

  get(name) {
    if (!this.db) {
      this.db = this.open();
    }

    this.debug(`getting secret '${name}'`);
    const result = this.db.first(`SELECT value FROM secrets WHERE name =?`, [
      name,
    ]);
    return result;
  }
}

const secretsDb = new SecretsDb();
const _cachedSecrets = new Map();
/**
 * A service for managing secrets stored in `secretsDb`.
 */
export const secretsService = {
  /**
   * Retrieves the value of a secret by name.
   * @param {SecretName} name - The name of the secret to retrieve.
   * @returns {string|null} The value of the secret, or null if the secret does not exist.
   */
  get: (name) => {
    return _cachedSecrets.get(name) ?? secretsDb.get(name)?.value ?? null;
  },

  /**
   * Sets the value of a secret by name.
   * @param {SecretName} name - The name of the secret to set.
   * @param {string} value - The value to set for the secret.
   * @returns {Object}
   */
  set: (name, value) => {
    const result = secretsDb.set(name, value);

    if (result.changes === 1) {
      _cachedSecrets.set(name, value);
    }
    return result;
  },

  /**
   * Determines whether a secret with the given name exists.
   * @param {SecretName} name - The name of the secret to check for existence.
   * @returns {boolean} True if a secret with the given name exists, false otherwise.
   */
  exists: (name) => {
    return Boolean(secretsService.get(name));
  },
};
