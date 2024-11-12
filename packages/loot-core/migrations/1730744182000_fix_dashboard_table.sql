BEGIN TRANSACTION;

UPDATE dashboard
SET tombstone = 1
WHERE type is NULL;

COMMIT;
