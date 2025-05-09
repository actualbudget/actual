BEGIN TRANSACTION;

UPDATE preferences
SET value = CASE WHEN id = 'budgetType' AND value = 'report' THEN 'tracking' ELSE 'envelope' END
WHERE id = 'budgetType';

COMMIT;
