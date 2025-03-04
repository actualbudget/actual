BEGIN TRANSACTION;

ALTER TABLE accounts ADD COLUMN last_reconciled text;

COMMIT;
