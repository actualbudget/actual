CREATE TABLE holdings (
  id TEXT PRIMARY KEY,
  account TEXT,

  symbol TEXT,
  title TEXT,
  shares INTEGER,
  purchase_price INTEGER,
  market_value INTEGER,

  imported_id TEXT,
  raw_synced_data TEXT,

  tombstone INTEGER DEFAULT 0,
  FOREIGN KEY(account) REFERENCES accounts(id)
);
