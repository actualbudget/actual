BEGIN TRANSACTION;

-- Sync messages that reference tables/columns this client doesn't have yet
-- (sent by a client running a newer version). They are applied by
-- `replayPendingMessages` once the local schema catches up.
-- Keyed per cell: replay is last-write-wins per cell, so only the
-- newest deferred value is kept, bounding growth while a client stays
-- on an old version.
CREATE TABLE messages_pending
  (dataset TEXT NOT NULL,
   row TEXT NOT NULL,
   column TEXT NOT NULL,
   timestamp TEXT NOT NULL,
   -- The serialized string form, e.g. "S:hello" (see `serializeValue`),
   -- unlike messages_crdt.value which stores binary
   value TEXT NOT NULL,
   PRIMARY KEY (dataset, row, column));

COMMIT;
