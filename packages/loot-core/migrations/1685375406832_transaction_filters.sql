BEGIN TRANSACTION;

CREATE TABLE transaction_filters
  (id TEXT PRIMARY KEY,
   name TEXT,
   conditions TEXT,
   tombstone INTEGER DEFAULT 0);

COMMIT;
