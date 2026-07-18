import type { Database } from '@jlongster/sql.js';

import * as sqlite from '#platform/server/sqlite';

// `required` means a row cannot be inserted without explicitly providing
// this column (NOT NULL, no DEFAULT, not the primary key). `pk` means
// the column is part of the table's primary key.
type ColumnFlags = { required: boolean; pk: boolean };

export type TableSnapshot = {
  columns: Map<string, ColumnFlags>;
  // Column lists of UNIQUE constraints/indexes, e.g. "a" or "a,b"
  uniques: Set<string>;
};

// table -> its columns and unique constraints, from PRAGMA introspection
export type SchemaSnapshot = Map<string, TableSnapshot>;

export function snapshotSchema(db: Database): SchemaSnapshot {
  const tables = sqlite.runQuery<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    [],
    true,
  );
  return new Map(
    tables.map(({ name: table }): [string, TableSnapshot] => {
      const columns = new Map(
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
      );
      const uniques = new Set(
        sqlite
          .runQuery<{ name: string; unique: number; origin: string }>(
            db,
            `PRAGMA index_list("${table}")`,
            [],
            true,
          )
          .filter(index => index.unique !== 0 && index.origin !== 'pk')
          .map(index =>
            sqlite
              .runQuery<{ name: string }>(
                db,
                `PRAGMA index_info("${index.name}")`,
                [],
                true,
              )
              .map(column => column.name)
              .sort()
              .join(','),
          ),
      );
      return [table, { columns, uniques }];
    }),
  );
}

// A schema change is additive-only when every column that existed before
// still exists after, unchanged, and nothing new constrains what older
// clients may write: sync builds rows one column at a time (see `apply`
// in #server/sync), so a required column in a synced table can never be
// inserted, and a new UNIQUE constraint can be violated by rows other
// devices already hold. This backs the additive-migrations guard that
// `checkDatabaseValidity` relies on for cross-version compatibility.
export function findAdditiveViolations(
  before: SchemaSnapshot,
  after: SchemaSnapshot,
  nonSyncedTables: Set<string>,
): string[] {
  const violations: string[] = [];

  for (const [table, { columns: beforeColumns }] of before) {
    const afterColumns = after.get(table)?.columns;
    for (const name of beforeColumns.keys()) {
      if (!afterColumns?.has(name)) {
        violations.push(
          `column "${table}.${name}" (or its table) was removed or renamed`,
        );
      }
    }
  }

  for (const [table, { columns: afterColumns, uniques }] of after) {
    const beforeTable = before.get(table);

    // The internal-table exemption applies only at creation: a new
    // internal table is written exclusively by app code that knows its
    // schema, always with full rows. Once a table exists, changes are
    // validated regardless of syncedness — older app versions can open
    // this budget (see `checkDatabaseValidity`) and their code writes
    // these tables with the column lists they were built with.
    if (!beforeTable && nonSyncedTables.has(table)) {
      continue;
    }

    for (const [name, column] of afterColumns) {
      const prev = beforeTable?.columns.get(name);
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

    // A new UNIQUE constraint rejects data that older clients (or other
    // devices on the same version) already have or keep writing, so
    // applying their sync messages would fail
    for (const unique of uniques) {
      if (!beforeTable?.uniques.has(unique)) {
        violations.push(
          `table "${table}" gained a UNIQUE constraint on (${unique})`,
        );
      }
    }

    if (!beforeTable) {
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
