CREATE VIEW "actual"."v_transactions_internal" AS (
    SELECT
      "actual"."transactions"."id",
      "actual"."transactions"."is_parent",
      "actual"."transactions"."is_child",
      CASE WHEN "actual"."transactions"."is_child" IS FALSE THEN NULL ELSE "actual"."transactions"."parent_id" END AS parent_id,
      "actual"."transactions"."acct" AS account,
      CASE WHEN "actual"."transactions"."is_parent" IS TRUE THEN NULL ELSE "actual"."category_mapping"."transfer_id" END AS category,
      COALESCE("actual"."transactions"."amount", 0) AS amount,
      "actual"."payee_mapping"."target_id" AS payee,
      "actual"."transactions"."notes",
      "actual"."transactions"."date",
      "actual"."transactions"."financial_id" AS imported_id,
      "actual"."transactions"."error",
      "actual"."transactions"."imported_description" AS imported_payee,
      "actual"."transactions"."starting_balance_flag",
      "actual"."transactions"."transferred_id" AS transfer_id,
      "actual"."transactions"."schedule",
      "actual"."transactions"."cleared",
      "actual"."transactions"."reconciled",
      "actual"."transactions"."tombstone",
      "actual"."transactions"."sort_order"
    FROM
      "actual"."transactions"
    LEFT JOIN
      "actual"."category_mapping"
        ON "actual"."transactions"."category" = "actual"."category_mapping"."id"
    LEFT JOIN
      "actual"."payee_mapping"
        ON "actual"."transactions"."description" = "actual"."payee_mapping"."id"
    WHERE
      "actual"."transactions"."date" IS NOT NULL
      AND "actual"."transactions"."acct" IS NOT NULL
      AND ("actual"."transactions"."is_child" IS FALSE OR "actual"."transactions"."parent_id" IS NOT NULL)
  );