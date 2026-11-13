import { getAccountDb } from '../src/account-db';

export async function up() {
  getAccountDb().exec(`
    CREATE TABLE oauth_authorization_codes (
      code_hash TEXT PRIMARY KEY NOT NULL,
      client_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX oauth_authorization_codes_expiry ON oauth_authorization_codes (expires_at);
  `);
}

export async function down() {
  getAccountDb().exec('DROP TABLE oauth_authorization_codes');
}
