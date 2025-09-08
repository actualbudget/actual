-- Add pay period configuration table
CREATE TABLE IF NOT EXISTS pay_period_config (
  id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  pay_frequency TEXT DEFAULT 'monthly',
  start_date TEXT,
  pay_day_of_week INTEGER,
  pay_day_of_month INTEGER,
  year_start INTEGER
);

-- Insert default configuration if not exists
INSERT INTO pay_period_config (id, enabled, pay_frequency, start_date, year_start)
SELECT 'default', 0, 'monthly', '2025-01-01', 2025
WHERE NOT EXISTS (SELECT 1 FROM pay_period_config WHERE id = 'default');

