BEGIN TRANSACTION;

CREATE INDEX IF NOT EXISTS messages_crdt_search ON messages_crdt(dataset, row, "column", timestamp);

ANALYZE;

COMMIT;
