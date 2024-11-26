BEGIN TRANSACTION;

CREATE TABLE rules
  (id TEXT PRIMARY KEY,
   stage TEXT,
   conditions TEXT,
   actions TEXT,
   tombstone INTEGER DEFAULT 0);

COMMIT;
