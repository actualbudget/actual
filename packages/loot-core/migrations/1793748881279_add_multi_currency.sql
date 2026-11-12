BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS exchange_rates
  (id TEXT PRIMARY KEY,
   from_currency TEXT,
   to_currency TEXT,
   rate REAL,
   date INTEGER,
   source TEXT DEFAULT 'manual',
   created_at INTEGER,
   tombstone INTEGER DEFAULT 0);

CREATE INDEX IF NOT EXISTS exchange_rates_pair_date
  ON exchange_rates (from_currency, to_currency, date);

ALTER TABLE accounts ADD COLUMN currency TEXT DEFAULT NULL;

COMMIT;
