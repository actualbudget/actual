BEGIN TRANSACTION;

UPDATE accounts
SET
  account_sync_source = 'goCardless'
WHERE account_id IS NOT NULL
  AND account_sync_source IS NULL;

COMMIT;
