BEGIN TRANSACTION;

ALTER TABLE zero_budgets ADD column goal INTEGER DEFAULT null;
ALTER TABLE reflect_budgets ADD column goal INTEGER DEFAULT null;

COMMIT;
