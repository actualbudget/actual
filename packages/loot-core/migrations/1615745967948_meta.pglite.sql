BEGIN TRANSACTION;

CREATE TABLE __meta__ (key TEXT PRIMARY KEY, value TEXT);

-- Order is important here because these views have dependencies on each other
DROP VIEW IF EXISTS v_categories;
DROP VIEW IF EXISTS v_transactions;
DROP VIEW IF EXISTS v_transactions_layer1;
DROP VIEW IF EXISTS v_transactions_layer2;

COMMIT;
