-- Add pay period configuration table
CREATE TABLE IF NOT EXISTS pay_period_config (
  id TEXT PRIMARY KEY,
  pay_frequency TEXT DEFAULT 'monthly',
  start_date TEXT,
  pay_day_of_week INTEGER,
  pay_day_of_month INTEGER
);

-- Insert default configuration if not exists
INSERT INTO pay_period_config (id, pay_frequency, start_date)
SELECT 'default', 'monthly', '2025-01-01'
WHERE NOT EXISTS (SELECT 1 FROM pay_period_config WHERE id = 'default');

