import getAccountDb from './src/account-db.js';
import runMigrations from './src/migrations.js';

export default async function setup() {
  await runMigrations();

  // Insert a fake "valid-token" fixture that can be reused
  const db = getAccountDb();
  await db.mutate('INSERT INTO sessions (token) VALUES (?)', ['valid-token']);
}
