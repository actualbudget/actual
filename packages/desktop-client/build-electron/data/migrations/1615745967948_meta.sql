BEGIN TRANSACTION;

CREATE TABLE __meta__ (key TEXT PRIMARY KEY, value TEXT);

DROP VIEW IF EXISTS v_transactions_layer2;
DROP VIEW IF EXISTS v_transactions_layer1;
DROP VIEW IF EXISTS v_transactions;
DROP VIEW IF EXISTS v_categories;

COMMIT;
