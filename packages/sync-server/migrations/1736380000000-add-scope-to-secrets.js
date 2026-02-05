import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(`
    -- Create new secrets table with scope column
    CREATE TABLE IF NOT EXISTS secrets_new (
      scope TEXT NOT NULL,
      name TEXT NOT NULL,
      value BLOB,
      PRIMARY KEY(scope, name)
    );

    -- Migrate existing secrets to global scope
    INSERT INTO secrets_new (scope, name, value)
    SELECT 'global', name, value FROM secrets;

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

    -- Migrate only global-scoped secrets back
    INSERT INTO secrets_old (name, value)
    SELECT name, value FROM secrets WHERE scope = 'global';

    -- Drop new table and rename old one
    DROP TABLE secrets;
    ALTER TABLE secrets_old RENAME TO secrets;
  `);
};
