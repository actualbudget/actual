BEGIN TRANSACTION;

UPDATE transactions AS t1
SET schedule = (
    SELECT t2.schedule FROM transactions AS t2
    WHERE t2.id = t1.transferred_id
      AND t2.schedule IS NOT NULL
    LIMIT 1
)
WHERE t1.schedule IS NULL
AND t1.transferred_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM transactions AS t2
  WHERE t2.id = t1.transferred_id
    AND t2.schedule IS NOT NULL
  LIMIT 1
);

COMMIT;
