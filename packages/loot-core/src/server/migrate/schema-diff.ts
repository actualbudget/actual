import type { Database } from '@jlongster/sql.js';

import * as sqlite from '#platform/server/sqlite';

// One entry per column, keyed "table.column". `required` means a row
// cannot be inserted without explicitly providing this column (NOT NULL,
// no DEFAULT, not the primary key).
export type SchemaSnapshot = Map<string, { table: string; required: boolean }>;

export function snapshotSchema(db: Database): SchemaSnapshot {
  const tables = sqlite.runQuery<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    [],
    true,
  );
  return new Map(
    tables.flatMap(({ name: table }) =>
      sqlite
        .runQuery<{
          name: string;
          notnull: number;
          dflt_value: string | null;
          pk: number;
        }>(db, `PRAGMA table_info("${table}")`, [], true)
        .map((column): [string, { table: string; required: boolean }] => [
          `${table}.${column.name}`,
          {
            table,
            required:
              column.notnull !== 0 &&
              column.dflt_value == null &&
              column.pk === 0,
          },
        ]),
    ),
  );
}

// A schema change is additive-only when every column that existed before
// still exists after (a dropped or renamed table shows up as all of its
// columns disappearing), and any new column outside `nonSyncedTables` is
// optional — sync builds rows one column at a time (see `apply` in
// #server/sync), so a required column in a synced table can never be
// inserted. This backs the additive-migrations guard that
// `checkDatabaseValidity` relies on for cross-version compatibility.
export function findAdditiveViolations(
  before: SchemaSnapshot,
  after: SchemaSnapshot,
  nonSyncedTables: Set<string>,
): string[] {
  return [
    ...[...before.keys()]
      .filter(key => !after.has(key))
      .map(key => `column "${key}" (or its table) was removed or renamed`),
    ...[...after]
      .filter(
        ([key, column]) =>
          !before.has(key) &&
          column.required &&
          !nonSyncedTables.has(column.table),
      )
      .map(([key]) => `new column "${key}" is NOT NULL without a DEFAULT`),
  ];
}
