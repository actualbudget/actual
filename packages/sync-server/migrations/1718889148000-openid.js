import getAccountDb from '../src/account-db.js';

export const up = async function () {
  await getAccountDb().exec(
    `
    BEGIN TRANSACTION;
     CREATE TABLE auth_new
        (method TEXT PRIMARY KEY,
        display_name TEXT,
        extra_data TEXT, active INTEGER);

    INSERT INTO auth_new (method, display_name, extra_data, active)
      SELECT 'password', 'Password', password, 1 FROM auth;
        DROP TABLE auth;
        ALTER TABLE auth_new RENAME TO auth;

    CREATE TABLE pending_openid_requests
      (state TEXT PRIMARY KEY,
      code_verifier TEXT,
      return_url TEXT,
      expiry_time INTEGER);
    COMMIT;`,
  );
};

export const down = async function () {
  await getAccountDb().exec(
    `
    BEGIN TRANSACTION;
    ALTER TABLE auth RENAME TO auth_temp;
    CREATE TABLE auth
        (password TEXT);
    INSERT INTO auth (password)
      SELECT extra_data FROM auth_temp WHERE method = 'password';
    DROP TABLE auth_temp;

    DROP TABLE pending_openid_requests;
    COMMIT;
      `,
  );
};
