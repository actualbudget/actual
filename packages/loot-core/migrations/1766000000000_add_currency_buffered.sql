CREATE TABLE zero_budget_month_currencies
  (id TEXT PRIMARY KEY,
   month TEXT,
   currency_code TEXT,
   buffered INTEGER DEFAULT 0);

CREATE INDEX zero_budget_month_currencies_month_currency
  ON zero_budget_month_currencies(month, currency_code);
