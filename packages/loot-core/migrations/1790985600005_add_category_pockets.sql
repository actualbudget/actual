BEGIN TRANSACTION;

-- Budget lanes beside each category's own lane (MC-10): a category's base
-- lanes after a cutover (kind 'base', generation 1 and later) and its
-- currency pockets (kind 'foreign', encoding CUR.P). Encoding and
-- generation are written once, at creation.
CREATE TABLE IF NOT EXISTS category_pockets
  (id TEXT PRIMARY KEY,
   category TEXT,
   kind TEXT,
   encoding TEXT,
   generation INTEGER,
   tombstone INTEGER DEFAULT 0);

-- A pocket lane's monthly cells. budget_pair is the authority,
-- native:base~ENC@capture-date (base empty while pending); the other
-- amount columns derive from it (coupled-cells).
CREATE TABLE IF NOT EXISTS pocket_budgets
  (id TEXT PRIMARY KEY,
   month INTEGER,
   lane TEXT,
   carryover INTEGER DEFAULT 0,
   budget_pair TEXT,
   amount INTEGER,
   amount_encoding TEXT,
   base_amount INTEGER,
   capture_date TEXT);
CREATE INDEX IF NOT EXISTS pocket_budgets_lane ON pocket_budgets(lane);

-- Retirement and forward authority: a retired lane's history belongs to
-- its owner slot. Only undo tombstones a retirement.
CREATE TABLE IF NOT EXISTS slot_retirements
  (id TEXT PRIMARY KEY,
   owner TEXT,
   tombstone INTEGER DEFAULT 0);

-- Visibility of a slot (base or currency child); no accounting role.
CREATE TABLE IF NOT EXISTS category_slot_meta
  (id TEXT PRIMARY KEY,
   hidden INTEGER DEFAULT 0,
   sort_order REAL,
   shown INTEGER DEFAULT 0);

-- The lane a row was routed to, and the encoding stamp of its amount pair.
ALTER TABLE transactions ADD COLUMN pocket TEXT DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN pair_encoding TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS trans_pocket ON transactions(pocket);

-- Local, never synced: each lane's owner, effective category and status,
-- rebuilt from the synced tables after every applied batch and on load.
CREATE TABLE IF NOT EXISTS slot_resolution
  (lane TEXT PRIMARY KEY,
   kind TEXT,
   origin_category TEXT,
   encoding TEXT,
   effective_owner TEXT,
   effective_category TEXT,
   status TEXT,
   active INTEGER DEFAULT 0);

COMMIT;
