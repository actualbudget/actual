BEGIN TRANSACTION;

CREATE TABLE rules
  (id VARCHAR(36) PRIMARY KEY,
   stage TEXT,
   conditions JSONB,
   actions JSONB,
   tombstone BOOLEAN DEFAULT FALSE);

COMMIT;
