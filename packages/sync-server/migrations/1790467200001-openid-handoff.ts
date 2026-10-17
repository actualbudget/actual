import { getAccountDb } from '../src/account-db';

export async function up() {
  getAccountDb().transaction(() => {
    getAccountDb().exec(`
      DELETE FROM pending_openid_requests;
      ALTER TABLE pending_openid_requests ADD COLUMN client_state TEXT;
      ALTER TABLE pending_openid_requests ADD COLUMN client_challenge TEXT;
      CREATE TABLE openid_handoffs (
        code TEXT PRIMARY KEY,
        client_challenge TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        session_expires_at INTEGER NOT NULL
      );
    `);
  });
}

export async function down() {
  getAccountDb().transaction(() => {
    getAccountDb().exec(`
      DROP TABLE openid_handoffs;
      DELETE FROM pending_openid_requests;
      ALTER TABLE pending_openid_requests DROP COLUMN client_state;
      ALTER TABLE pending_openid_requests DROP COLUMN client_challenge;
    `);
  });
}
