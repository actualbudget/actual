BEGIN TRANSACTION;

ALTER TABLE payees ADD COLUMN learn_categories BOOLEAN DEFAULT TRUE;

COMMIT;
