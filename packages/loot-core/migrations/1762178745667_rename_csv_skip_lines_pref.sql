BEGIN TRANSACTION;

-- Rename csv-skip-lines-* preferences to csv-skip-start-lines-*
UPDATE preferences
SET id = REPLACE(id, 'csv-skip-lines-', 'csv-skip-start-lines-')
WHERE id LIKE 'csv-skip-lines-%';

COMMIT;
