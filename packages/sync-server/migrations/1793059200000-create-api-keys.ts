import { getAccountDb } from '../src/account-db';

export async function up() {
  getAccountDb().exec(`
    CREATE TABLE api_keys (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX api_keys_user_id ON api_keys (user_id);
  `);
}

export async function down() {
  getAccountDb().exec('DROP TABLE api_keys');
}
