BEGIN TRANSACTION;

ALTER TABLE custom_reports ADD COLUMN sort_by TEXT DEFAULT 'asc';
UPDATE custom_reports SET sort_by = 'asc';

COMMIT;
