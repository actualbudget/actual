BEGIN TRANSACTION;

CREATE TABLE spreadsheet_reports
  (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rows TEXT DEFAULT '[]',
    show_formula_column INTEGER DEFAULT 1,
    tombstone INTEGER DEFAULT 0
  );

COMMIT; 