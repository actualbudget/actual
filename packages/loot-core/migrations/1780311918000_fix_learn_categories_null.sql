BEGIN TRANSACTION;

UPDATE payees SET learn_categories = 1 WHERE learn_categories IS NULL;

COMMIT;
