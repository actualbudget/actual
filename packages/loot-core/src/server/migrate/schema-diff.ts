import type { Database } from '@jlongster/sql.js';

import * as sqlite from '#platform/server/sqlite';

// One entry per column, keyed "table.column". `required` means a row
// cannot be inserted without explicitly providing this column (NOT NULL,
// no DEFAULT, not the primary key). `pk` means the column is part of the
// table's primary key.
export type SchemaSnapshot = Map<
  string,
  { table: string; required: boolean; pk: boolean }
>;

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
        .map(
          (
            column,
          ): [string, { table: string; required: boolean; pk: boolean }] => [
            `${table}.${column.name}`,
            {
              table,
              required:
                column.notnull !== 0 &&
                column.dflt_value == null &&
                column.pk === 0,
              pk: column.pk !== 0,
            },
          ],
        ),
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
  const tablesBefore = new Set([...before.values()].map(c => c.table));
  const newSyncedTables = new Set(
    [...after.values()]
      .map(c => c.table)
      .filter(table => !tablesBefore.has(table) && !nonSyncedTables.has(table)),
  );

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
    // Sync addresses rows by their `id` column (see `apply` in
    // #server/sync), so a synced table needs exactly that as its
    // primary key — no other name, no composite keys
    ...[...newSyncedTables]
      .filter(table => {
        const pks = [...after]
          .filter(([, c]) => c.table === table && c.pk)
          .map(([key]) => key);
        return pks.length !== 1 || pks[0] !== `${table}.id`;
      })
      .map(
        table =>
          `new table "${table}" must have a single primary key named "id"`,
      ),
  ];
}
