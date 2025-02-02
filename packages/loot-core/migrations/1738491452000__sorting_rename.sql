BEGIN TRANSACTION;

ALTER TABLE custom_reports ALTER COLUMN sort_by set DEFAULT 'desc';
UPDATE custom_reports SET sort_by = 'desc' where sort_by = 'Descending';
UPDATE custom_reports SET sort_by = 'asc' where sort_by = 'Ascending';
UPDATE custom_reports SET sort_by = 'budget' where sort_by = 'Budget';
UPDATE custom_reports SET sort_by = 'name' where sort_by = 'Name';

COMMIT;
