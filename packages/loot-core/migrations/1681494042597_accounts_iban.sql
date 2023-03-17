BEGIN TRANSACTION;

ALTER TABLE accounts ADD COLUMN iban TEXT;

CREATE INDEX account_iban ON accounts(iban);

COMMIT;
