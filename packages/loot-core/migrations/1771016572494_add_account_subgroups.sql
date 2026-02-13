BEGIN TRANSACTION;

CREATE TABLE account_subgroups
  (id TEXT PRIMARY KEY,
   name TEXT,
   sort_order REAL,
   tombstone INTEGER NOT NULL DEFAULT 1);

ALTER TABLE accounts ADD COLUMN subgroup TEXT;

CREATE TRIGGER account_subgroups_tombstone_on_account_insert
AFTER INSERT ON accounts
WHEN NEW.subgroup IS NOT NULL
BEGIN
  UPDATE account_subgroups
  SET tombstone =
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM accounts a
        WHERE a.subgroup = account_subgroups.id
          AND a.tombstone = 0
      )
      THEN 0
      ELSE 1
    END
  WHERE id = NEW.subgroup;
END;

CREATE TRIGGER account_subgroups_tombstone_on_account_update
AFTER UPDATE OF subgroup, tombstone ON accounts
BEGIN
  UPDATE account_subgroups
  SET tombstone =
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM accounts a
        WHERE a.subgroup = account_subgroups.id
          AND a.tombstone = 0
      )
      THEN 0
      ELSE 1
    END
  WHERE id = OLD.subgroup OR id = NEW.subgroup;
END;

CREATE TRIGGER account_subgroups_tombstone_on_account_delete
AFTER DELETE ON accounts
WHEN OLD.subgroup IS NOT NULL
BEGIN
  UPDATE account_subgroups
  SET tombstone =
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM accounts a
        WHERE a.subgroup = account_subgroups.id
          AND a.tombstone = 0
      )
      THEN 0
      ELSE 1
    END
  WHERE id = OLD.subgroup;
END;

COMMIT;
