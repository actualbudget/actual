/*
BEGIN TRANSACTION;

CREATE TABLE custom_reports
  (id TEXT PRIMARY KEY,
   name TEXT,
   start_date TEXT,
   end_date TEXT,
   date_paused INTEGER DEFAULT 0,
   mode TEXT DEFAULT 'total',
   group_by TEXT DEFAULT 'Category',
   balance_type TEXT DEFAULT 'Expense',
   interval TEXT DEFAULT 'Monthly',
   show_empty INTEGER DEFAULT 0,
   show_offbudgethidden INTEGER DEFAULT 0,
   show_uncategorized INTEGER DEFAULT 0,
   selected_categories TEXT,
   graph_type TEXT DEFAULT 'BarGraph',
   conditions TEXT,
   conditions_op TEXT DEFAULT 'and',
   metadata TEXT,
   color_scheme TEXT,
   tombstone INTEGER DEFAULT 0);

COMMIT;

*/