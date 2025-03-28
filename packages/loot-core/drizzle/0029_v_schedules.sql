CREATE VIEW "public"."v_schedules" AS (
    WITH parsed_rule_conditions AS (
      SELECT
        "rules"."id" AS rule_id,
        jsonb_extract_path_text(condition, 'value') AS value,
        condition ->> 'field' AS field,
        condition ->> 'op' AS op
      FROM
        "rules"
      CROSS JOIN
        jsonb_array_elements("rules"."conditions"::jsonb) AS condition
    )
    SELECT
        "schedules"."id",
        "schedules"."name",
        "schedules"."rule",
        CASE
            WHEN "schedules_next_date"."local_next_date_ts" = "schedules_next_date"."base_next_date_ts" THEN "schedules_next_date"."local_next_date"
            ELSE "schedules_next_date"."base_next_date"
        END AS next_date,
        "schedules"."completed",
        "schedules"."posts_transaction",
        "schedules"."tombstone",
        "payee_mapping"."target_id" AS _payee,
        account_condition.value AS _account,
        amount_condition.value AS _amount,
        amount_condition.op AS _amount_op,
        date_condition.value AS _date,
        "rules"."conditions" AS _conditions,
        "rules"."actions" AS _actions
    FROM
        "schedules"
    LEFT JOIN
        "schedules_next_date" ON "schedules_next_date"."schedule_id" = "schedules"."id"
    LEFT JOIN
        "rules" ON "rules"."id" = "schedules"."rule"
    LEFT JOIN
        parsed_rule_conditions payee_condition
          ON payee_condition.rule_id = "rules"."id"
            AND payee_condition.field = 'payee'
    LEFT JOIN
        "payee_mapping" ON "payee_mapping"."id" = payee_condition.value
    LEFT JOIN
        parsed_rule_conditions account_condition
          ON account_condition.rule_id = "rules"."id"
            AND account_condition.field = 'account'
    LEFT JOIN
        parsed_rule_conditions amount_condition
          ON amount_condition.rule_id = "rules"."id"
            AND amount_condition.field = 'amount'
    LEFT JOIN
        parsed_rule_conditions date_condition
          ON date_condition.rule_id = "rules"."id"
            AND date_condition.field = 'date'
  );