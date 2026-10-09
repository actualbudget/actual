import { getAccountDb } from '../src/account-db';

export async function up() {
  const db = getAccountDb();
  db.transaction(() => {
    db.exec(`CREATE TABLE openid_identities (
      provider TEXT NOT NULL,
      subject TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (provider, subject),
      UNIQUE (provider, user_id)
    )`);
    db.mutate("DELETE FROM sessions WHERE auth_method = 'openid'");
    db.mutate('DELETE FROM pending_openid_requests');
  });
}

export async function down() {
  getAccountDb().exec('DROP TABLE openid_identities');
}
