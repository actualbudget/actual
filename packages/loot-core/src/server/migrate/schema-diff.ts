// Test-only: imported solely by additive-migrations.test.ts, which
// enforces the additive-only migration policy in CI. Nothing enforces
// that policy at runtime — see `checkDatabaseValidity` for what the app
// itself tolerates.
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

// Collapses whitespace so formatting differences in SQL text don't
// register as changes
function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

// Quoted literals/identifiers (doubled quotes are escapes) and comments.
// The input is well-formed SQL from sqlite_master, so unterminated
// quotes/comments can't occur.
const NON_CODE =
  /'(?:[^']|'')*'|"(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|--[^\n]*|\/\*[\s\S]*?\*\//g;

// Extracts each CHECK(...) expression by scanning to the balanced close
// paren, normalized (whitespace collapsed, lowercased) so formatting
// differences don't register as changes. The scan runs on a masked copy
// with literals and comments blanked to spaces (length-preserving, so
// indexes line up) — a CHECK or paren inside one can't start or end a
// clause. Clause text is sliced from the original so literal contents
// survive intact.
function checkClauses(sql: string): string[] {
  const masked = sql.replace(NON_CODE, match => ' '.repeat(match.length));
  const clauses: string[] = [];
  const starts = /\bCHECK\s*\(/gi;
  let match;
  while ((match = starts.exec(masked))) {
    const start = match.index + match[0].length;
    let i = start;
    for (let depth = 1; i < masked.length && depth > 0; i++) {
      if (masked[i] === '(') {
        depth++;
      } else if (masked[i] === ')') {
        depth--;
      }
    }
    clauses.push(normalizeSql(sql.slice(start, i - 1)).toLowerCase());
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
              column.dflt_value == null
                ? null
                : normalizeSql(column.dflt_value);
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
                type: normalizeSql(column.type).toLowerCase(),
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
      if (!prev) {
        if (column.required) {
          violations.push(
            `new column "${table}.${name}" is NOT NULL without a DEFAULT`,
          );
        }
        continue;
      }
      // A table rebuild can change an existing column in place; every
      // attribute change breaks one side of the version skew: NOT NULL
      // and type alter what each version accepts or coerces, a
      // different DEFAULT fills omitted columns with diverging values
      // (and removing one breaks per-column sync inserts), and
      // primary-key membership backs sync's addressing by id
      const changed = (
        ['notNull', 'pk', 'type', 'defaultValue'] as const
      ).filter(key => column[key] !== prev[key]);
      if (changed.length > 0) {
        violations.push(
          `existing column "${table}.${name}" changed: ${changed.join(', ')}`,
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
