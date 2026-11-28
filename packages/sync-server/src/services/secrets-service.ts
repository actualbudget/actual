import createDebug from 'debug';
import type { Debugger } from 'debug';

import { getAccountDb } from '#account-db';
import type { WrappedDatabase } from '#db';

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

function getSecretKey(name: string, fileId: string | null) {
  return fileId == null ? name : `${name}:${fileId}`;
}

class SecretsDb {
  private debug: Debugger;
  private db: WrappedDatabase | null;

  constructor() {
    this.debug = createDebug('actual:secrets-db');
    this.db = null;
  }

  open(): WrappedDatabase {
    return getAccountDb();
  }

  set(name: string, value: string | null, fileId: string | null = null) {
    if (!this.db) {
      this.db = this.open();
    }

    const secretKey = getSecretKey(name, fileId);
    this.debug(`setting secret '${name}'`);
    return this.db.mutate(
      `INSERT OR REPLACE INTO secrets (name, value) VALUES (?, ?)`,
      [secretKey, value],
    );
  }

  get(name: string, fileId: string | null = null) {
    if (!this.db) {
      this.db = this.open();
    }

    const secretKey = getSecretKey(name, fileId);
    this.debug(`getting secret '${name}'`);
    return this.db.first<{ value: string | null }>(
      `SELECT value FROM secrets WHERE name = ?`,
      [secretKey],
    );
  }

  reset(name: string, fileId: string | null = null) {
    if (!this.db) {
      this.db = this.open();
    }

    const secretKey = getSecretKey(name, fileId);
    const result = this.db.mutate(`DELETE FROM secrets WHERE name = ?`, [
      secretKey,
    ]);
    return {
      ...result,
      deletedFrom: fileId == null ? 'global' : 'per-budget-file',
    };
  }
}

const secretsDb = new SecretsDb();

/**
 * A service for managing secrets stored in `secretsDb`.
 */
export const secretsService = {
  /**
   * Retrieves the active value of a secret by name.
   * @param name - The name of the secret to retrieve.
   * @param fileId - Budget file ID for this secret.
   * @returns The value of the secret, or null if the secret does not exist.
   */
  get: (name: string, fileId: string | null = null): string | null => {
    return secretsDb.get(name, fileId)?.value ?? null;
  },

  /**
   * Sets the value of a secret by name.
   * @param name - The name of the secret to set.
   * @param value - The value to set for the secret. Older clients clear a
   *   secret by sending `null`.
   * @param fileId - Budget file ID for this secret.
   */
  set: (name: string, value: string | null, fileId: string | null = null) => {
    return secretsDb.set(name, value, fileId);
  },

  reset: (name: string, fileId: string | null = null) => {
    return secretsDb.reset(name, fileId);
  },

  /**
   * Determines whether a secret with the given name exists.
   * @param name - The name of the secret to check for existence.
   * @param fileId - Budget file ID for this secret.
   * @returns True if a secret with the given name exists, false otherwise.
   */
  exists: (name: string, fileId: string | null = null): boolean => {
    return secretsService.get(name, fileId) !== null;
  },
};
