BEGIN TRANSACTION;

-- Sync messages that reference tables/columns this client doesn't have yet
-- (sent by a client running a newer version). They are applied by
-- `replayPendingMessages` once the local schema catches up.
CREATE TABLE messages_pending
  (timestamp TEXT PRIMARY KEY,
   dataset TEXT NOT NULL,
   row TEXT NOT NULL,
   column TEXT NOT NULL,
   value BLOB NOT NULL);

COMMIT;
