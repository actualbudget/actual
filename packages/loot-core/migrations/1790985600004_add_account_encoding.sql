BEGIN TRANSACTION;

-- An account's encoding as one synced value, so currency and precision
-- written on different devices cannot mix (MC-7.3). '' is the budget
-- currency, CUR.P a foreign account.
ALTER TABLE accounts ADD COLUMN encoding TEXT DEFAULT NULL;
UPDATE accounts SET encoding = CASE
  WHEN currency IS NULL THEN ''
  ELSE currency || '.' || currency_precision
END;

-- Cached bank balances stamped with the encoding they were written in.
ALTER TABLE accounts ADD COLUMN balance_spec TEXT DEFAULT NULL;
UPDATE accounts SET balance_spec =
  COALESCE(balance_current, '') || ':' || COALESCE(balance_available, '') ||
  ':' || COALESCE(balance_limit, '') || '~' || encoding;

COMMIT;
