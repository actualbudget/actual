BEGIN TRANSACTION;

    CREATE TABLE IF NOT EXISTS payee_locations (
      id TEXT PRIMARY KEY,
      payee_id TEXT,
      latitude REAL,
      longitude REAL,
      created_at INTEGER,
      tombstone INTEGER DEFAULT 0
    );

    -- Create index on payee_id for faster lookups
    CREATE INDEX IF NOT EXISTS idx_payee_locations_payee_id ON payee_locations (payee_id);

    -- Create index on created_at for time-based queries
    CREATE INDEX IF NOT EXISTS idx_payee_locations_created_at ON payee_locations (created_at);

    -- Create composite index for efficient payee and time-based filtering
    CREATE INDEX IF NOT EXISTS idx_payee_locations_composite ON payee_locations (payee_id, created_at);

COMMIT;
