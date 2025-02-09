BEGIN TRANSACTION;

ALTER TABLE accounts ADD COLUMN last_sync text;

ALTER TABLE transactions ADD COLUMN raw_synced_data text;

COMMIT;
