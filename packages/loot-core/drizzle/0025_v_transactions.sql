CREATE VIEW "public"."v_transactions" AS (
    SELECT
      "v_transactions_internal_alive"."id",
      "v_transactions_internal_alive"."is_parent",
      "v_transactions_internal_alive"."is_child",
      "v_transactions_internal_alive"."parent_id",
      "accounts"."id" AS account,
      "categories"."id" AS category,
      "v_transactions_internal_alive"."amount",
      "payees"."id" AS payee,
      "v_transactions_internal_alive"."notes",
      "v_transactions_internal_alive"."date",
      "v_transactions_internal_alive"."imported_id",
      "v_transactions_internal_alive"."error",
      "v_transactions_internal_alive"."imported_payee",
      "v_transactions_internal_alive"."starting_balance_flag",
      "v_transactions_internal_alive"."transfer_id",
      "v_transactions_internal_alive"."sort_order",
      "v_transactions_internal_alive"."cleared",
      "v_transactions_internal_alive"."reconciled",
      "v_transactions_internal_alive"."tombstone",
      "v_transactions_internal_alive"."schedule"
    FROM
      "v_transactions_internal_alive"
    LEFT JOIN
      "payees"
        ON ("payees"."id" = "v_transactions_internal_alive"."payee"
        AND "payees"."tombstone" IS FALSE)
    LEFT JOIN
      "categories"
        ON ("categories"."id" = "v_transactions_internal_alive"."category"
        AND "categories"."tombstone" IS FALSE)
    LEFT JOIN
      "accounts"
        ON ("accounts"."id" = "v_transactions_internal_alive"."account"
        AND "accounts"."tombstone" IS FALSE)
    ORDER BY
      "v_transactions_internal_alive"."date" DESC,
      "v_transactions_internal_alive"."starting_balance_flag",
      "v_transactions_internal_alive"."sort_order" DESC,
      "v_transactions_internal_alive"."id"
  );