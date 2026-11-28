BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS category_currencies
  (id TEXT PRIMARY KEY,
   category TEXT,
   currency TEXT,
   start_month INTEGER,
   tombstone INTEGER DEFAULT 0);

CREATE INDEX IF NOT EXISTS category_currencies_category_currency
  ON category_currencies (category, currency);

COMMIT;
