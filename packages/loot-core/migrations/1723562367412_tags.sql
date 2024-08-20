BEGIN TRANSACTION;

CREATE TABLE tags
  (
    id TEXT PRIMARY KEY,
    tag TEXT,
    color TEXT,
    textColor TEXT,
    hoverColor TEXT
  );

COMMIT;