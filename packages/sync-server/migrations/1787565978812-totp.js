import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(
    `
    BEGIN TRANSACTION;
    CREATE TABLE auth_totp
      (id INTEGER PRIMARY KEY CHECK (id = 1),
      secret TEXT NOT NULL,
      confirmed INTEGER NOT NULL DEFAULT 0,
      last_used_step INTEGER,
      created_at INTEGER NOT NULL);

    CREATE TABLE pending_mfa_challenges
      (token TEXT PRIMARY KEY,
      user_id TEXT,
      expiry_time INTEGER,
      attempts INTEGER NOT NULL DEFAULT 0);
    COMMIT;`,
  );
};

export const down = async function () {
  await getAccountDb().exec(
    `
    BEGIN TRANSACTION;
    DROP TABLE auth_totp;
    DROP TABLE pending_mfa_challenges;
    COMMIT;`,
  );
};
