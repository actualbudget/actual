import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(
    `
    BEGIN TRANSACTION;
    CREATE TABLE pending_webauthn_challenges
      (challenge TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      expiry_time INTEGER NOT NULL);
    COMMIT;`,
  );
};

export const down = async function () {
  await getAccountDb().exec(
    `
    BEGIN TRANSACTION;
    DROP TABLE pending_webauthn_challenges;
    COMMIT;`,
  );
};
