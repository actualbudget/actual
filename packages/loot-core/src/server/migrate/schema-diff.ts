import type { Database } from '@jlongster/sql.js';

import * as sqlite from '#platform/server/sqlite';

// `required` means a row cannot be inserted without explicitly providing
// this column (NOT NULL, no usable DEFAULT, not the primary key).
// `notNull` is the raw NOT NULL flag, tracked separately because a NOT
// NULL column with a DEFAULT still rejects explicit NULL writes. `pk`
// means the column is part of the table's primary key. `type` is the
// normalized declared type and `defaultValue` the normalized DEFAULT
// expression (null when absent or an explicit NULL, which behaves the
// same) — both must stay unchanged on existing columns.
type ColumnFlags = {
  required: boolean;
  notNull: boolean;
  pk: boolean;
  type: string;
  defaultValue: string | null;
};

export type TableSnapshot = {
  columns: Map<string, ColumnFlags>;
  // Column lists of UNIQUE constraints/indexes, e.g. "a" or "a,b"
  uniques: Set<string>;
  // Normalized CHECK constraint expressions, sorted. PRAGMAs don't
  // expose CHECKs, so they are extracted from the canonical CREATE
  // TABLE text SQLite stores
  checks: string[];
};

// Extracts each CHECK(...) expression by scanning to the balanced close
// paren, normalized (whitespace collapsed, lowercased) so formatting
// differences don't register as changes. Parens inside quoted
// literals/identifiers and comments don't count toward balancing —
// truncating there would hide any change made after the quote.
function checkClauses(sql: string): string[] {
  const clauses: string[] = [];
  const starts = /\bCHECK\s*\(/gi;
  let match;
  while ((match = starts.exec(sql))) {
    const start = match.index + match[0].length;
    let i = start;
    for (let depth = 1; i < sql.length && depth > 0; i++) {
      const ch = sql[i];
      if (ch === '(') {
        depth++;
      } else if (ch === ')') {
        depth--;
      } else if (ch === "'" || ch === '"' || ch === '`') {
        // Skip to the closing quote; a doubled quote is an escape
        for (i++; i < sql.length; i++) {
          if (sql[i] === ch) {
            if (sql[i + 1] === ch) {
              i++;
            } else {
              break;
            }
          }
        }
      } else if (ch === '[') {
        const end = sql.indexOf(']', i + 1);
        i = end < 0 ? sql.length : end;
      } else if (ch === '-' && sql[i + 1] === '-') {
        const end = sql.indexOf('\n', i);
        i = end < 0 ? sql.length : end;
      } else if (ch === '/' && sql[i + 1] === '*') {
        const end = sql.indexOf('*/', i + 2);
        i = end < 0 ? sql.length : end + 1;
      }
    }
    clauses.push(
      sql
        .slice(start, i - 1)
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase(),
    );
  }
  return clauses.sort();
}

// table -> its columns and constraints, from schema introspection
export type SchemaSnapshot = Map<string, TableSnapshot>;

export function snapshotSchema(db: Database): SchemaSnapshot {
  const tables = sqlite.runQuery<{ name: string; sql: string }>(
    db,
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    [],
    true,
  );
  return new Map(
    tables.map(({ name: table, sql }): [string, TableSnapshot] => {
      const columns = new Map(
        sqlite
          .runQuery<{
            name: string;
            type: string;
            notnull: number;
            dflt_value: string | null;
            pk: number;
          }>(db, `PRAGMA table_info("${table}")`, [], true)
          .map((column): [string, ColumnFlags] => {
            // PRAGMA reports the DEFAULT as verbatim SQL text; an
            // explicit `DEFAULT NULL` comes back as the string "NULL",
            // which is not a usable default for a NOT NULL column
            const rawDefault =
              column.dflt_value?.replace(/\s+/g, ' ').trim() ?? null;
            const defaultValue =
              rawDefault?.toUpperCase() === 'NULL' ? null : rawDefault;
            return [
              column.name,
              {
                required:
                  column.notnull !== 0 &&
                  defaultValue == null &&
                  column.pk === 0,
                notNull: column.notnull !== 0,
                pk: column.pk !== 0,
                type: column.type.replace(/\s+/g, ' ').trim().toLowerCase(),
                defaultValue,
              },
            ];
          }),
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
      return [table, { columns, uniques, checks: checkClauses(sql) }];
    }),
  );
}

// A schema change is additive-only when every column that existed before
// still exists after, unchanged, and no constraint changes in either
// direction. Tightening (NOT NULL, UNIQUE, CHECK) rejects data older
// clients legitimately hold or keep writing; loosening lets newer
// clients write data that *older* clients' schema rejects when it syncs
// back. Sync also builds rows one column at a time (see `apply` in
// #server/sync), so a required column in a synced table can never be
// inserted. This backs the additive-migrations guard that
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

  for (const [table, { columns: afterColumns, uniques, checks }] of after) {
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
      // A table rebuild can change an existing column in place; any
      // NOT NULL change breaks one side (a DEFAULT doesn't save an
      // explicit NULL write), and changing primary-key membership
      // breaks sync's addressing by id
      if (prev && column.notNull !== prev.notNull) {
        violations.push(
          `existing column "${table}.${name}" changed its NOT NULL constraint`,
        );
      }
      if (prev && column.pk !== prev.pk) {
        violations.push(
          `existing column "${table}.${name}" changed primary-key membership`,
        );
      }
      // A type change alters affinity/coercion between versions, and a
      // different DEFAULT makes old and new clients fill omitted
      // columns with diverging values
      if (prev && column.type !== prev.type) {
        violations.push(
          `existing column "${table}.${name}" changed its declared type`,
        );
      }
      if (prev && column.defaultValue !== prev.defaultValue) {
        violations.push(
          `existing column "${table}.${name}" changed its DEFAULT value`,
        );
      }
      // With NOT NULL unchanged, a `required` flip means a DEFAULT was
      // added or removed on a NOT NULL column — removal breaks inserts
      // that omit the column, which is every per-column sync insert
      if (prev && column.required !== prev.required) {
        violations.push(
          `existing column "${table}.${name}" changed whether an explicit value is required (NOT NULL/DEFAULT)`,
        );
      }
    }

    // Constraint changes only matter on existing tables — a brand-new
    // table gets the same constraints on every client that runs its
    // migration, so there is no version skew to protect against
    if (beforeTable) {
      for (const unique of uniques) {
        if (!beforeTable.uniques.has(unique)) {
          violations.push(
            `table "${table}" gained a UNIQUE constraint on (${unique})`,
          );
        }
      }
      for (const unique of beforeTable.uniques) {
        if (!uniques.has(unique)) {
          violations.push(
            `table "${table}" lost a UNIQUE constraint on (${unique})`,
          );
        }
      }

      if (beforeTable.checks.join(';') !== checks.join(';')) {
        violations.push(`table "${table}" changed its CHECK constraints`);
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
