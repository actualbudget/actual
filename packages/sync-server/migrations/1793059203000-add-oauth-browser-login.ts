import { getAccountDb } from '../src/account-db';

export async function up() {
  getAccountDb().exec(`
    ALTER TABLE pending_openid_requests ADD COLUMN oauth_query TEXT;
    ALTER TABLE pending_openid_requests ADD COLUMN browser_nonce_hash TEXT;
  `);
}

export async function down() {
  getAccountDb().exec(`
    ALTER TABLE pending_openid_requests DROP COLUMN browser_nonce_hash;
    ALTER TABLE pending_openid_requests DROP COLUMN oauth_query;
  `);
}
