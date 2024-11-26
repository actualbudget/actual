BEGIN TRANSACTION;

DROP VIEW IF EXISTS v_transactions_layer2;
CREATE VIEW v_transactions_layer2 AS
SELECT
  t.id AS id,
  t.isParent AS is_parent,
  t.isChild AS is_child,
  t.acct AS account,
  CASE WHEN t.isChild = 0 THEN NULL ELSE t.parent_id END AS parent_id,
  CASE WHEN t.isParent = 1 THEN NULL ELSE cm.transferId END AS category,
  pm.targetId AS payee,
  t.imported_description AS imported_payee,
  IFNULL(t.amount, 0) AS amount,
  t.notes AS notes,
  t.date AS date,
  t.financial_id AS imported_id,
  t.error AS error,
  t.starting_balance_flag AS starting_balance_flag,
  t.transferred_id AS transfer_id,
  t.sort_order AS sort_order,
  t.cleared AS cleared,
  t.tombstone AS tombstone
FROM transactions t
LEFT JOIN category_mapping cm ON cm.id = t.category
LEFT JOIN payee_mapping pm ON pm.id = t.description
WHERE
  t.date IS NOT NULL AND
  t.acct IS NOT NULL;

CREATE INDEX trans_sorted ON transactions(date desc, starting_balance_flag, sort_order desc, id);

DROP VIEW IF EXISTS v_transactions_layer1;
CREATE VIEW v_transactions_layer1 AS
SELECT t.* FROM v_transactions_layer2 t
LEFT JOIN transactions t2 ON (t.is_child = 1 AND t2.id = t.parent_id)
WHERE IFNULL(t.tombstone, 0) = 0 AND IFNULL(t2.tombstone, 0) = 0;

DROP VIEW IF EXISTS v_transactions;
CREATE VIEW v_transactions AS
SELECT t.* FROM v_transactions_layer1 t
ORDER BY t.date desc, t.starting_balance_flag, t.sort_order desc, t.id;


DROP VIEW IF EXISTS v_categories;
CREATE VIEW v_categories AS
SELECT
  id,
  name,
  is_income,
  cat_group AS "group",
  sort_order,
  tombstone
FROM categories;

COMMIT;
