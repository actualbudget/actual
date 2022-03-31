BEGIN TRANSACTION;

CREATE TABLE payees
  (id TEXT PRIMARY KEY,
   name TEXT,
   category TEXT,
   tombstone INTEGER DEFAULT 0,
   transfer_acct TEXT);

CREATE TABLE payee_rules
  (id TEXT PRIMARY KEY,
   payee_id TEXT,
   type TEXT,
   value TEXT,
   tombstone INTEGER DEFAULT 0);

CREATE INDEX payee_rules_lowercase_index ON payee_rules(LOWER(value));

CREATE TABLE payee_mapping
  (id TEXT PRIMARY KEY,
   targetId TEXT);

COMMIT;
