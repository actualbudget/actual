import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(`
    CREATE TABLE IF NOT EXISTS secrets_new (
      file_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value BLOB,
      PRIMARY KEY(file_id, name)
    );

    INSERT OR IGNORE INTO secrets_new (file_id, name, value)
    SELECT files.id, secrets.name, secrets.value
    FROM secrets
    CROSS JOIN files
    WHERE files.deleted = 0;

    DROP TABLE secrets;
    ALTER TABLE secrets_new RENAME TO secrets;
  `);
};

export const down = async function () {
  await getAccountDb().exec(`
    CREATE TABLE IF NOT EXISTS secrets_old (
      name TEXT PRIMARY KEY,
      value BLOB
    );

    INSERT OR IGNORE INTO secrets_old (name, value)
    SELECT name, value FROM secrets;

    DROP TABLE secrets;
    ALTER TABLE secrets_old RENAME TO secrets;
  `);
};
