BEGIN TRANSACTION;

-- Pairs an account identifier found in imported files with an account.
-- `id` is a hash of the external identifier, so one external account can
-- pair with at most one account; an account can have several rows.
CREATE TABLE account_import_refs
  (id TEXT PRIMARY KEY,
   account TEXT,
   tombstone INTEGER DEFAULT 0);

COMMIT;
