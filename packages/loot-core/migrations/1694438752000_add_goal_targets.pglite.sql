BEGIN TRANSACTION;

ALTER TABLE zero_budgets ADD column goal BIGINT DEFAULT null;
ALTER TABLE reflect_budgets ADD column goal BIGINT DEFAULT null;
ALTER TABLE categories ADD column goal_def JSONB DEFAULT null;

COMMIT;
