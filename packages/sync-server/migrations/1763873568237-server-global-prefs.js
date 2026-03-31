import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();

  accountDb.exec(`
    CREATE TABLE IF NOT EXISTS server_prefs
      (key TEXT NOT NULL PRIMARY KEY,
       value TEXT);
  `);
};

export const down = async function () {
  const accountDb = getAccountDb();

  accountDb.exec(`
    DROP TABLE IF EXISTS server_prefs;
  `);
};
