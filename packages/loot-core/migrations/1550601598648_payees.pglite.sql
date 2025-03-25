BEGIN TRANSACTION;

CREATE TABLE payees
  (id VARCHAR(36) PRIMARY KEY,
   name TEXT,
   category TEXT,
   tombstone BOOLEAN DEFAULT FALSE, -- changed to BOOLEAN for PostgreSQL
   transfer_acct VARCHAR(36));

CREATE TABLE payee_rules
  (id VARCHAR(36) PRIMARY KEY,
   payee_id VARCHAR(36),
   type TEXT,
   value TEXT,
   tombstone BOOLEAN DEFAULT FALSE);

CREATE INDEX payee_rules_lowercase_index ON payee_rules(LOWER(value));

CREATE TABLE payee_mapping
  (id VARCHAR(36) PRIMARY KEY,
   targetId VARCHAR(36));

COMMIT;
