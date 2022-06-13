BEGIN TRANSACTION;

ALTER TABLE transactions ADD COLUMN parent_id TEXT;

UPDATE transactions SET
  parent_id = CASE
    WHEN isChild THEN SUBSTR(id, 1, INSTR(id, '/') - 1)
    ELSE NULL
  END;

CREATE INDEX trans_parent_id ON transactions(parent_id);

COMMIT;
