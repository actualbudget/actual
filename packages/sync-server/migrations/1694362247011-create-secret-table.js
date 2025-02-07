import getAccountDb from '../src/account-db.js';

export const up = async function () {
  await getAccountDb().exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      name TEXT PRIMARY KEY,
      value BLOB
    );
  `);
};

export const down = async function () {
  await getAccountDb().exec(`
    DROP TABLE secrets;
  `);
};
