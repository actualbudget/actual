BEGIN TRANSACTION;

CREATE TABLE transaction_filters
  (id VARCHAR(36) PRIMARY KEY,
   name TEXT,
   conditions JSONB,
   conditions_op TEXT DEFAULT 'and',
   tombstone BOOLEAN DEFAULT FALSE);

COMMIT;
