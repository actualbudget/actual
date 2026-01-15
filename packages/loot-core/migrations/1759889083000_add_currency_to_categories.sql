BEGIN TRANSACTION;

-- Add currency field to categories for Primary Currency Per Category budgeting
-- NULL currency means category uses the base currency (backward compatible)
-- When budgeting, the system will draw from the account balance pool matching this currency
ALTER TABLE categories ADD COLUMN currency TEXT DEFAULT NULL;

COMMIT;
