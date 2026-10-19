BEGIN TRANSACTION;

ALTER TABLE dashboard_pages ADD COLUMN sort_order REAL;

-- Backfill in insertion order. The page the `multiple_dashboards` migration
-- seeded is always the first row in this table, so it sorts first on every
-- device -- which is what makes it the page that adopts widgets synced from
-- a device whose seeded page has a different id. 16384 is SORT_INCREMENT.
UPDATE dashboard_pages SET sort_order = rowid * 16384;

COMMIT;
