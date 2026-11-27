import { getAccountDb } from '../src/account-db';

export async function up() {
  getAccountDb().exec(`
    CREATE TABLE oauth_issued_tokens (
      key_id TEXT PRIMARY KEY NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      code_hash TEXT
    );
    CREATE UNIQUE INDEX oauth_issued_tokens_code_hash
      ON oauth_issued_tokens (code_hash) WHERE code_hash IS NOT NULL;
  `);
}

export async function down() {
  getAccountDb().exec('DROP TABLE oauth_issued_tokens');
}
