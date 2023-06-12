BEGIN TRANSACTION;

CREATE TABLE transaction_filters
  (id TEXT PRIMARY KEY,
   name TEXT,
   conditions TEXT,
   conditions_op TEXT DEFAULT 'and',
   tombstone INTEGER DEFAULT 0);

COMMIT;
