import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(`
    CREATE TABLE IF NOT EXISTS secrets_new (
      name TEXT NOT NULL,
      value BLOB,
      file_id TEXT
    );

    INSERT INTO secrets_new (name, value, file_id)
    SELECT name, value, NULL FROM secrets;

    DROP TABLE secrets;
    ALTER TABLE secrets_new RENAME TO secrets;

    CREATE UNIQUE INDEX IF NOT EXISTS secrets_global_name_idx
      ON secrets(name)
      WHERE file_id IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS secrets_file_name_idx
      ON secrets(file_id, name)
      WHERE file_id IS NOT NULL;
  `);
};

export const down = async function () {
  await getAccountDb().exec(`
    DROP INDEX IF EXISTS secrets_global_name_idx;
    DROP INDEX IF EXISTS secrets_file_name_idx;

    CREATE TABLE IF NOT EXISTS secrets_old (
      name TEXT PRIMARY KEY,
      value BLOB
    );

    INSERT OR REPLACE INTO secrets_old (name, value)
    SELECT name, value FROM secrets WHERE file_id IS NULL;

    DROP TABLE secrets;
    ALTER TABLE secrets_old RENAME TO secrets;
  `);
};
