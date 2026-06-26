BEGIN TRANSACTION;

CREATE INDEX IF NOT EXISTS idx_transactions_acct_tombstone ON transactions(acct, tombstone);
CREATE INDEX IF NOT EXISTS idx_transactions_tombstone ON transactions(tombstone);
CREATE INDEX IF NOT EXISTS idx_transactions_schedule ON transactions(schedule);

COMMIT;
