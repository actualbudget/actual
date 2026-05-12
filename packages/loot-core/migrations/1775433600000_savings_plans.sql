BEGIN TRANSACTION;

CREATE TABLE savings_plans(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount INTEGER NOT NULL DEFAULT 0 CHECK(target_amount >= 0),
  saved_amount INTEGER NOT NULL DEFAULT 0 CHECK(saved_amount >= 0),
  months INTEGER NOT NULL DEFAULT 1 CHECK(months > 0),
  start_month TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
  tombstone INTEGER NOT NULL DEFAULT 0 CHECK(tombstone IN (0, 1))
);

COMMIT;
