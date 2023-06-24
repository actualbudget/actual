BEGIN TRANSACTION;

ALTER TABLE transactions ADD COLUMN is_transfer BOOLEAN DEFAULT FALSE;

UPDATE transactions SET
  is_transfer = CASE
    WHEN transferred_id is NULL THEN FALSE
    ELSE TRUE
  END;

COMMIT;
