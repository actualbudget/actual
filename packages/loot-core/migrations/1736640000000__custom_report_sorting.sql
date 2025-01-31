BEGIN TRANSACTION;

ALTER TABLE custom_reports ADD COLUMN sort_by TEXT DEFAULT 'desc';
UPDATE custom_reports SET sort_by = 'desc';
UPDATE custom_reports SET sort_by = 'Budget' where graph_type = 'TableGraph';

COMMIT;
