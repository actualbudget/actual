import type { Database } from '@jlongster/sql.js';

import * as sqlite from '#platform/server/sqlite';

// `required` means a row cannot be inserted without explicitly providing
// this column (NOT NULL, no DEFAULT, not the primary key). `pk` means
// the column is part of the table's primary key.
type ColumnFlags = { required: boolean; pk: boolean };

// table -> column -> flags, from PRAGMA table_info
export type SchemaSnapshot = Map<string, Map<string, ColumnFlags>>;

export function snapshotSchema(db: Database): SchemaSnapshot {
  const tables = sqlite.runQuery<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    [],
    true,
  );
  return new Map(
    tables.map(({ name: table }): [string, Map<string, ColumnFlags>] => [
      table,
      new Map(
        sqlite
          .runQuery<{
            name: string;
            notnull: number;
            dflt_value: string | null;
            pk: number;
          }>(db, `PRAGMA table_info("${table}")`, [], true)
          .map((column): [string, ColumnFlags] => [
            column.name,
            {
              required:
                column.notnull !== 0 &&
                column.dflt_value == null &&
                column.pk === 0,
              pk: column.pk !== 0,
            },
          ]),
      ),
    ]),
  );
}

// A schema change is additive-only when every column that existed before
// still exists after, unchanged (a dropped or renamed table shows up as
// all of its columns disappearing), and any new column outside
// `nonSyncedTables` is optional — sync builds rows one column at a time
// (see `apply` in #server/sync), so a required column in a synced table
// can never be inserted. This backs the additive-migrations guard that
// `checkDatabaseValidity` relies on for cross-version compatibility.
export function findAdditiveViolations(
  before: SchemaSnapshot,
  after: SchemaSnapshot,
  nonSyncedTables: Set<string>,
): string[] {
  const violations: string[] = [];

  for (const [table, beforeColumns] of before) {
    const afterColumns = after.get(table);
    for (const name of beforeColumns.keys()) {
      if (!afterColumns?.has(name)) {
        violations.push(
          `column "${table}.${name}" (or its table) was removed or renamed`,
        );
      }
    }
  }

  for (const [table, afterColumns] of after) {
    if (nonSyncedTables.has(table)) {
      continue;
    }
    const beforeColumns = before.get(table);

    for (const [name, column] of afterColumns) {
      const prev = beforeColumns?.get(name);
      if (!prev && column.required) {
        violations.push(
          `new column "${table}.${name}" is NOT NULL without a DEFAULT`,
        );
      }
      // A table rebuild can change an existing column in place:
      // tightening it to NOT NULL breaks per-column inserts from older
      // clients, and changing primary-key membership breaks sync's
      // addressing by id
      if (prev && column.required && !prev.required) {
        violations.push(
          `existing column "${table}.${name}" became NOT NULL without a DEFAULT`,
        );
      }
      if (prev && column.pk !== prev.pk) {
        violations.push(
          `existing column "${table}.${name}" changed primary-key membership`,
        );
      }
    }

    if (!beforeColumns) {
      // Sync addresses rows by their `id` column (see `apply` in
      // #server/sync), so a new synced table needs exactly that as its
      // primary key — no other name, no composite keys
      const pks = [...afterColumns]
        .filter(([, c]) => c.pk)
        .map(([name]) => name);
      if (pks.length !== 1 || pks[0] !== 'id') {
        violations.push(
          `new table "${table}" must have a single primary key named "id"`,
        );
      }
    }
  }

  return violations;
}
