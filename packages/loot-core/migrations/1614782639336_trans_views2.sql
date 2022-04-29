BEGIN TRANSACTION;

-- This adds the isChild/parent_id constraint in `where`
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
  t.acct IS NOT NULL AND
  (t.isChild = 0 OR t.parent_id IS NOT NULL);

COMMIT;
