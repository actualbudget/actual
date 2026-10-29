BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS schedule_occurrences
  (id TEXT PRIMARY KEY,
   schedule_id TEXT,
   due_date TEXT,
   status TEXT,
   transaction_id TEXT,
   tombstone INTEGER DEFAULT 0);

CREATE INDEX IF NOT EXISTS schedule_occurrences_schedule
  ON schedule_occurrences (schedule_id, due_date);

COMMIT;
