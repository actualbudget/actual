ALTER TABLE dashboard ADD COLUMN use_dashboard_date_range INTEGER NOT NULL DEFAULT 1;
UPDATE dashboard SET use_dashboard_date_range = 0 WHERE type = 'calendar-card';
