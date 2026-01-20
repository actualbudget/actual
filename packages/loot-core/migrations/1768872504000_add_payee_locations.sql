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
    CREATE INDEX IF NOT EXISTS idx_payee_locations_tombstone_payee_created ON payee_locations (tombstone, payee_id, created_at);

    -- Create geospatial composite index with tombstone for location-based queries
    CREATE INDEX IF NOT EXISTS idx_payee_locations_geo_tombstone ON payee_locations (tombstone, latitude, longitude);

COMMIT;
