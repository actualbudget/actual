BEGIN TRANSACTION;

ALTER TABLE custom_reports ADD COLUMN sort_by TEXT DEFAULT 'asc';

COMMIT;
