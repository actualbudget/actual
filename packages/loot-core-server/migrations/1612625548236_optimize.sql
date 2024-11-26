BEGIN TRANSACTION;

CREATE INDEX messages_crdt_search ON messages_crdt(dataset, row, column, timestamp);

ANALYZE;

COMMIT;
