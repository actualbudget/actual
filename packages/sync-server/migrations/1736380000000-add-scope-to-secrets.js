import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(`
    -- Create new secrets table with file_id column
    CREATE TABLE IF NOT EXISTS secrets_new (
      file_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value BLOB,
      PRIMARY KEY(file_id, name)
    );

    -- Migrate existing secrets with a placeholder file_id (will be resolved by the next migration)
    INSERT INTO secrets_new (file_id, name, value)
    SELECT '__global__', name, value FROM secrets;

    -- Drop old table and rename new one
    DROP TABLE secrets;
    ALTER TABLE secrets_new RENAME TO secrets;
  `);
};

export const down = async function () {
  await getAccountDb().exec(`
    -- Create old secrets table structure
    CREATE TABLE IF NOT EXISTS secrets_old (
      name TEXT PRIMARY KEY,
      value BLOB
    );

    -- Migrate only placeholder-scoped secrets back
    INSERT INTO secrets_old (name, value)
    SELECT name, value FROM secrets WHERE file_id = '__global__';

    -- Drop new table and rename old one
    DROP TABLE secrets;
    ALTER TABLE secrets_old RENAME TO secrets;
  `);
};
