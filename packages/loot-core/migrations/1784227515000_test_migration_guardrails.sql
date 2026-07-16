BEGIN TRANSACTION;

CREATE TABLE __migration_guardrails_test (id TEXT PRIMARY KEY);
DROP TABLE __migration_guardrails_test;

COMMIT;
