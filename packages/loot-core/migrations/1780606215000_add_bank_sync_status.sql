BEGIN TRANSACTION;

ALTER TABLE accounts ADD COLUMN bank_sync_status text;

COMMIT;
