BEGIN TRANSACTION;

CREATE TABLE currencies
  (id TEXT PRIMARY KEY,
   code TEXT,
   name TEXT,
   is_base INTEGER DEFAULT 0,
   sort_order REAL,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE exchange_rates
  (id TEXT PRIMARY KEY,
   from_currency TEXT,
   to_currency TEXT,
   date TEXT,
   rate TEXT,
   source TEXT DEFAULT 'manual',
   tombstone INTEGER DEFAULT 0);

CREATE INDEX exchange_rates_lookup
  ON exchange_rates(from_currency, to_currency, date, tombstone);

ALTER TABLE accounts ADD COLUMN currency TEXT;

ALTER TABLE transactions ADD COLUMN native_amount INTEGER;
ALTER TABLE transactions ADD COLUMN native_currency TEXT;
ALTER TABLE transactions ADD COLUMN base_currency TEXT;
ALTER TABLE transactions ADD COLUMN exchange_rate TEXT;
ALTER TABLE transactions ADD COLUMN exchange_rate_date TEXT;
ALTER TABLE transactions ADD COLUMN exchange_rate_id TEXT;
ALTER TABLE transactions ADD COLUMN exchange_rate_locked INTEGER DEFAULT 1;
ALTER TABLE transactions ADD COLUMN fx_recalculated_at TEXT;

UPDATE accounts
SET currency = IFNULL(
  (SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'),
  ''
)
WHERE currency IS NULL;

UPDATE transactions
SET native_amount = amount,
    native_currency = IFNULL(
      (SELECT currency FROM accounts WHERE accounts.id = transactions.acct),
      IFNULL((SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'), '')
    ),
    base_currency = IFNULL((SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'), ''),
    exchange_rate = '1',
    exchange_rate_date =
      printf(
        '%04d-%02d-%02dT00:00:00',
        date / 10000,
        (date / 100) % 100,
        date % 100
      ),
    exchange_rate_locked = 1
WHERE native_amount IS NULL;

COMMIT;
