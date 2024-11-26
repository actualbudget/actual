BEGIN TRANSACTION;

UPDATE category_groups
SET
  hidden = 0
WHERE is_income = 1;

COMMIT;