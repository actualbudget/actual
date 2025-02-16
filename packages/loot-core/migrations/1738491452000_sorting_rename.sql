BEGIN TRANSACTION;

ALTER TABLE custom_reports RENAME COLUMN sort_by TO sort_by_old;
ALTER TABLE custom_reports ADD COLUMN sort_by TEXT DEFAULT 'desc';

UPDATE custom_reports SET sort_by = 'desc' where sort_by_old = 'Descending';
UPDATE custom_reports SET sort_by = 'asc' where sort_by_old = 'Ascending';
UPDATE custom_reports SET sort_by = 'budget' where sort_by_old = 'Budget';
UPDATE custom_reports SET sort_by = 'name' where sort_by_old = 'Name';

ALTER TABLE custom_reports DROP COLUMN sort_by_old;

COMMIT;
