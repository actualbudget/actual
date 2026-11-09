import { getAccountDb } from '../src/account-db';

export async function up() {
  getAccountDb().exec(`CREATE TABLE api_key_permissions (
    key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    PRIMARY KEY (key_id, permission)
  )`);
}

export async function down() {
  getAccountDb().exec('DROP TABLE api_key_permissions');
}
