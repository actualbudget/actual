BEGIN TRANSACTION;

ALTER TABLE accounts ADD COLUMN account_sync_source TEXT;

UPDATE accounts SET
  account_sync_source = CASE
    WHEN account_id THEN 'goCardless'
    ELSE NULL
  END;

COMMIT;
