CREATE VIEW "public"."v_transactions_internal_alive" AS (
    SELECT
      "v_transactions_internal".*
    FROM
      "v_transactions_internal"
    LEFT JOIN
      "transactions"
        ON ("transactions"."is_child" IS TRUE
        AND "transactions"."id" = "v_transactions_internal"."parent_id")
    WHERE
      COALESCE("transactions"."tombstone", FALSE) IS FALSE
      AND ("v_transactions_internal"."is_child" IS FALSE OR "transactions"."tombstone" IS FALSE)
  );