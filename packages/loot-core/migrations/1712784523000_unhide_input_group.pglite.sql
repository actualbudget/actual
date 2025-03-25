BEGIN TRANSACTION;

UPDATE category_groups
SET
  hidden = FALSE
WHERE is_income IS TRUE;

COMMIT;
