BEGIN TRANSACTION;

CREATE TABLE reports
  (id TEXT PRIMARY KEY,
   name TEXT,
   start TEXT,
   end TEXT, 
   mode TEXT DEFAULT 'total',
   groupBy TEXT DEFAULT 'Category',
   balanceType TEXT DEFAULT 'Expense',
   interval TEXT DEFAULT 'Monthly',
   empty INTEGER DEFAULT 0,
   hidden INTEGER DEFAULT 0,
   uncat INTEGER DEFAULT 0,
   selectedCategories TEXT,
   graphType TEXT DEFAULT 'BarGraph',
   viewLegend INTEGER DEFAULT 0,
   viewSummary INTEGER DEFAULT 0,
   viewLabels INTEGER DEFAULT 0,
   conditions TEXT,
   conditions_op TEXT DEFAULT 'and',
   sort_order REAL,
   data TEXT,
   colors TEXT,
   tombstone INTEGER DEFAULT 0);

COMMIT;
