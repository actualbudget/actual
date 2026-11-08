BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS exchange_rates
  (id TEXT PRIMARY KEY,
   base_currency TEXT,
   quote_currency TEXT,
   rate TEXT,
   kind TEXT,
   source TEXT,
   timestamp TEXT,
   spec TEXT,
   tombstone INTEGER DEFAULT 0);

COMMIT;
