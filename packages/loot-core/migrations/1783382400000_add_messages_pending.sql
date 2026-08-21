BEGIN TRANSACTION;

-- Sync messages deferred because they reference schema from a newer
-- app version; see `deferMessage` and `replayPendingMessages`.
CREATE TABLE messages_pending
  (dataset TEXT NOT NULL,
   row TEXT NOT NULL,
   column TEXT NOT NULL,
   timestamp TEXT NOT NULL,
   -- Serialized string form, e.g. "S:hello" (see `serializeValue`)
   value TEXT NOT NULL,
   PRIMARY KEY (dataset, row, column));

COMMIT;
