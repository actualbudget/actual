BEGIN TRANSACTION;

CREATE TABLE account_groups
  (id TEXT PRIMARY KEY,
   name TEXT,
   sort_order REAL);

ALTER TABLE accounts ADD COLUMN "group" TEXT;

COMMIT;
