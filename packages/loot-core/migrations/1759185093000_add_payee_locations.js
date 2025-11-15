export default async function runMigration(db) {
  // Create payee_locations table to store GPS coordinates for payees
  await db.execQuery(`
    CREATE TABLE payee_locations (
      id TEXT PRIMARY KEY,
      payee_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (payee_id) REFERENCES payees (id) ON DELETE CASCADE
    );
  `);

  // Create index on payee_id for faster lookups
  await db.execQuery(`
    CREATE INDEX idx_payee_locations_payee_id ON payee_locations (payee_id);
  `);

  // Create index on created_at for time-based queries
  await db.execQuery(`
    CREATE INDEX idx_payee_locations_created_at ON payee_locations (created_at);
  `);
}
