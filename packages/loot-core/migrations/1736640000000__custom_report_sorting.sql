BEGIN TRANSACTION;

ALTER TABLE custom_reports ADD COLUMN sort_by TEXT DEFAULT 'Descending';
UPDATE custom_reports SET sort_by = 'Descending';
UPDATE custom_reports SET sort_by = 'Budget' where graph_type = 'TableGraph';

COMMIT;
