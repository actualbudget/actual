CREATE VIEW "actual"."v_schedules" AS (
    WITH parsed_rule_conditions AS (
      SELECT
        "actual"."rules"."id" AS rule_id,
        jsonb_extract_path_text(condition, 'value') AS value,
        condition ->> 'field' AS field,
        condition ->> 'op' AS op
      FROM
        "actual"."rules"
      CROSS JOIN
        jsonb_array_elements("actual"."rules"."conditions"::jsonb) AS condition
    )
    SELECT
        "actual"."schedules"."id",
        "actual"."schedules"."name",
        "actual"."schedules"."rule",
        CASE
            WHEN "actual"."schedules_next_date"."local_next_date_ts" = "actual"."schedules_next_date"."base_next_date_ts" THEN "actual"."schedules_next_date"."local_next_date"
            ELSE "actual"."schedules_next_date"."base_next_date"
        END AS next_date,
        "actual"."schedules"."completed",
        "actual"."schedules"."posts_transaction",
        "actual"."schedules"."tombstone",
        "actual"."payee_mapping"."target_id" AS _payee,
        account_condition.value AS _account,
        amount_condition.value AS _amount,
        amount_condition.op AS _amount_op,
        date_condition.value AS _date,
        "actual"."rules"."conditions" AS _conditions,
        "actual"."rules"."actions" AS _actions
    FROM
        "actual"."schedules"
    LEFT JOIN
        "actual"."schedules_next_date" ON "actual"."schedules_next_date"."schedule_id" = "actual"."schedules"."id"
    LEFT JOIN
        "actual"."rules" ON "actual"."rules"."id" = "actual"."schedules"."rule"
    LEFT JOIN
        parsed_rule_conditions payee_condition
          ON payee_condition.rule_id = "actual"."rules"."id"
            AND payee_condition.field = 'payee'
    LEFT JOIN
        "actual"."payee_mapping" ON "actual"."payee_mapping"."id" = payee_condition.value
    LEFT JOIN
        parsed_rule_conditions account_condition
          ON account_condition.rule_id = "actual"."rules"."id"
            AND account_condition.field = 'account'
    LEFT JOIN
        parsed_rule_conditions amount_condition
          ON amount_condition.rule_id = "actual"."rules"."id"
            AND amount_condition.field = 'amount'
    LEFT JOIN
        parsed_rule_conditions date_condition
          ON date_condition.rule_id = "actual"."rules"."id"
            AND date_condition.field = 'date'
  );