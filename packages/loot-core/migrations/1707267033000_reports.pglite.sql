BEGIN TRANSACTION;

CREATE TABLE custom_reports
  (
    id VARCHAR(36) PRIMARY KEY,
    name TEXT,
    start_date DATE,
    end_date DATE,
    date_static BOOLEAN DEFAULT FALSE,
    date_range TEXT,
    mode TEXT DEFAULT 'total',
    group_by TEXT DEFAULT 'Category',
    balance_type TEXT DEFAULT 'Expense',
    show_empty BOOLEAN DEFAULT FALSE,
    show_offbudget BOOLEAN DEFAULT FALSE,
    show_hidden BOOLEAN DEFAULT FALSE,
    show_uncategorized BOOLEAN DEFAULT FALSE,
    selected_categories TEXT,
    graph_type TEXT DEFAULT 'BarGraph',
    conditions JSONB,
    conditions_op TEXT DEFAULT 'and',
    metadata JSONB,
    interval TEXT DEFAULT 'Monthly',
    color_scheme TEXT,
    tombstone BOOLEAN DEFAULT FALSE
  );

COMMIT;