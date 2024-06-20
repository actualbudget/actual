BEGIN TRANSACTION;

ALTER TABLE zero_budgets ADD column goal INTEGER DEFAULT null;
ALTER TABLE reflect_budgets ADD column goal INTEGER DEFAULT null;
ALTER TABLE categories ADD column goal_def TEXT DEFAULT null;

COMMIT;
