ALTER TABLE dashboard_pages ADD COLUMN date_range_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dashboard_pages ADD COLUMN time_frame TEXT;
ALTER TABLE dashboard ADD COLUMN use_dashboard_date_range INTEGER NOT NULL DEFAULT 0;
