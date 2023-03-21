BEGIN TRANSACTION;

ALTER TABLE accounts ADD COLUMN account_number TEXT;

CREATE INDEX accounts_account_number ON accounts(account_number);

COMMIT;
