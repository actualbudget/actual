CREATE TABLE holdings (
  id TEXT PRIMARY KEY,
  acct TEXT,

  symbol TEXT,
  title TEXT,
  shares INTEGER,
  purchase_price INTEGER,
  market_value INTEGER,

  financial_id TEXT,
  raw_synced_data TEXT,

  tombstone INTEGER DEFAULT 0,
  FOREIGN KEY(acct) REFERENCES accounts(id)
);
