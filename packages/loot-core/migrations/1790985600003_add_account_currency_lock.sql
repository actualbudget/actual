BEGIN TRANSACTION;

-- Set once a transaction has been in the account; an account's currency
-- names the encoding of every integer that can return to it (MC-5.1).
ALTER TABLE accounts ADD COLUMN currency_locked INTEGER DEFAULT NULL;
UPDATE accounts SET currency_locked = 1
  WHERE id IN (SELECT DISTINCT acct FROM transactions);

COMMIT;
