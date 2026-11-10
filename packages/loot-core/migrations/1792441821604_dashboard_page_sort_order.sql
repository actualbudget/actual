BEGIN TRANSACTION;

-- The default keeps a page created by a client that predates this column
-- (which syncs id and name but no sort_order) sorting last rather than
-- first: SQLite orders NULL ahead of every number, which would have such a
-- page displace the seeded one below.
ALTER TABLE dashboard_pages ADD COLUMN sort_order REAL DEFAULT 1000000000;

-- Backfill in insertion order. The page the `multiple_dashboards` migration
-- seeded is always the first row in this table, so it sorts first on every
-- device -- which is what makes it the page that adopts widgets synced from
-- a device whose seeded page has a different id. 16384 is SORT_INCREMENT.
UPDATE dashboard_pages SET sort_order = rowid * 16384;

COMMIT;
