CREATE VIEW "actual"."v_transactions_internal_alive" AS (
    SELECT
      "actual"."v_transactions_internal".*
    FROM
      "actual"."v_transactions_internal"
    LEFT JOIN
      "actual"."transactions"
        ON ("actual"."transactions"."is_child" IS TRUE
        AND "actual"."transactions"."id" = "v_transactions_internal"."parent_id")
    WHERE
      COALESCE("actual"."transactions"."tombstone", FALSE) IS FALSE
      AND ("v_transactions_internal"."is_child" IS FALSE OR "actual"."transactions"."tombstone" IS FALSE)
  );