type PluginMigration = [
  timestamp: number,
  name: string,
  upCommand: string,
  downCommand: string,
];

export const migrations: PluginMigration[] = [
  [
    1704067200000, // timestamp (2024-01-01 00:00:00 UTC)
    'create_dummy_items',
    `CREATE TABLE IF NOT EXISTS dummy_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      value REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    'DROP TABLE IF EXISTS dummy_items;',
  ],
];
