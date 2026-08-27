BEGIN TRANSACTION;

CREATE TABLE account_groups
  (id TEXT PRIMARY KEY,
   name TEXT,
   sort_order REAL,
   tombstone INTEGER DEFAULT 0);

ALTER TABLE accounts ADD COLUMN account_group_id TEXT DEFAULT NULL;

COMMIT;
