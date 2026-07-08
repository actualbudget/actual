// The schema guard enforces the additive-only migration policy: once a
// table, column, or index has shipped in a release, migrations may add new
// schema but must never remove or change what already exists. Removing or
// changing schema breaks older clients that sync against the same budget
// file. See https://actualbudget.org/docs/contributing/project-details/migrations
import type { Database } from '@jlongster/sql.js';

import * as sqlite from '#platform/server/sqlite';

export type ColumnSnapshot = {
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
};

export type RelationSnapshot = {
  columns: Record<string, ColumnSnapshot>;
};

export type IndexSnapshot = {
  table: string;
  unique: boolean;
  partial: boolean;
  columns: string[];
};

export type SchemaSnapshot = {
  tables: Record<string, RelationSnapshot>;
  views: Record<string, RelationSnapshot>;
  indexes: Record<string, IndexSnapshot>;
};

export type RetiredNames = {
  tables: string[];
  columns: string[];
};

export type SchemaDiff = {
  additions: string[];
  breakages: string[];
};

type SqliteMasterRow = {
  name: string;
  type: 'table' | 'view';
};

type TableInfoRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

type IndexListRow = {
  name: string;
  unique: number;
  origin: string;
  partial: number;
};

type IndexInfoRow = {
  seqno: number;
  name: string | null;
};

function getRelationSnapshot(db: Database, name: string): RelationSnapshot {
  const rows = sqlite.runQuery<TableInfoRow>(
    db,
    'SELECT * FROM pragma_table_info(?) ORDER BY cid',
    [name],
    true,
  );

  const columns: Record<string, ColumnSnapshot> = {};
  for (const row of rows) {
    columns[row.name] = {
      type: row.type,
      notNull: row.notnull !== 0,
      defaultValue: row.dflt_value,
      primaryKey: row.pk !== 0,
    };
  }
  return { columns };
}

function getIndexSnapshots(
  db: Database,
  table: string,
): Record<string, IndexSnapshot> {
  const rows = sqlite.runQuery<IndexListRow>(
    db,
    'SELECT * FROM pragma_index_list(?)',
    [table],
    true,
  );

  const indexes: Record<string, IndexSnapshot> = {};
  // Only track explicitly created indexes; the ones SQLite creates
  // internally for PRIMARY KEY/UNIQUE constraints are covered by the
  // column snapshots of the table itself.
  const created = rows
    .filter(row => row.origin === 'c')
    .sort((i1, i2) => (i1.name < i2.name ? -1 : i1.name > i2.name ? 1 : 0));

  for (const row of created) {
    const columnRows = sqlite.runQuery<IndexInfoRow>(
      db,
      'SELECT * FROM pragma_index_info(?) ORDER BY seqno',
      [row.name],
      true,
    );
    indexes[row.name] = {
      table,
      unique: row.unique !== 0,
      partial: row.partial !== 0,
      // A null column name means the index entry is an expression (or
      // rowid); represent it with a stable placeholder.
      columns: columnRows.map(col => col.name ?? '<expression>'),
    };
  }
  return indexes;
}

export function getSchemaSnapshot(db: Database): SchemaSnapshot {
  const relations = sqlite.runQuery<SqliteMasterRow>(
    db,
    `SELECT name, type FROM sqlite_master
       WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    [],
    true,
  );

  const snapshot: SchemaSnapshot = { tables: {}, views: {}, indexes: {} };

  for (const relation of relations) {
    const relationSnapshot = getRelationSnapshot(db, relation.name);
    if (relation.type === 'table') {
      snapshot.tables[relation.name] = relationSnapshot;
      Object.assign(snapshot.indexes, getIndexSnapshots(db, relation.name));
    } else {
      snapshot.views[relation.name] = relationSnapshot;
    }
  }

  return snapshot;
}

function diffRelations(
  kind: 'table' | 'view',
  baseline: Record<string, RelationSnapshot>,
  current: Record<string, RelationSnapshot>,
  additions: string[],
  breakages: string[],
): void {
  for (const [name, baseRelation] of Object.entries(baseline)) {
    const currentRelation = current[name];
    if (!currentRelation) {
      breakages.push(`${kind} "${name}" was removed`);
      continue;
    }

    for (const [columnName, baseColumn] of Object.entries(
      baseRelation.columns,
    )) {
      const currentColumn = currentRelation.columns[columnName];
      if (!currentColumn) {
        breakages.push(`column "${name}.${columnName}" was removed`);
      } else if (JSON.stringify(currentColumn) !== JSON.stringify(baseColumn)) {
        breakages.push(
          `column "${name}.${columnName}" changed from ` +
            `${JSON.stringify(baseColumn)} to ${JSON.stringify(currentColumn)}`,
        );
      }
    }

    for (const columnName of Object.keys(currentRelation.columns)) {
      if (!baseRelation.columns[columnName]) {
        additions.push(`column "${name}.${columnName}"`);
      }
    }
  }

  for (const name of Object.keys(current)) {
    if (!baseline[name]) {
      additions.push(`${kind} "${name}"`);
    }
  }
}

export function diffSchemaSnapshots(
  baseline: SchemaSnapshot,
  current: SchemaSnapshot,
): SchemaDiff {
  const additions: string[] = [];
  const breakages: string[] = [];

  diffRelations('table', baseline.tables, current.tables, additions, breakages);
  diffRelations('view', baseline.views, current.views, additions, breakages);

  for (const [name, baseIndex] of Object.entries(baseline.indexes)) {
    const currentIndex = current.indexes[name];
    if (!currentIndex) {
      breakages.push(
        `index "${name}" (on table "${baseIndex.table}") was removed`,
      );
    } else if (JSON.stringify(currentIndex) !== JSON.stringify(baseIndex)) {
      breakages.push(
        `index "${name}" changed from ${JSON.stringify(baseIndex)} ` +
          `to ${JSON.stringify(currentIndex)}`,
      );
    }
  }

  for (const name of Object.keys(current.indexes)) {
    if (!baseline.indexes[name]) {
      additions.push(`index "${name}"`);
    }
  }

  return { additions, breakages };
}

// Tables that are never populated over CRDT sync (migration/sync/cache
// bookkeeping), so the NOT NULL rule below doesn't apply to them.
const NON_SYNCED_TABLES = new Set([
  '__migrations__',
  'created_budgets',
  'kvcache',
  'kvcache_key',
  'messages_clock',
  'messages_crdt',
  'messages_pending',
]);

// Columns that shipped before this rule was enforced. They only work
// because clients happen to send the NOT NULL column's message first
// when creating a row. Do not add to this list.
const NOT_NULL_EXCEPTIONS = new Set(['cleanup_groups.name']);

// Synced tables are populated over CRDT sync one column at a time
// (`INSERT INTO t (id, col) VALUES (?, ?)`), so a NOT NULL column
// without a default can break row creation on receiving clients. SQLite
// itself forbids this for `ALTER TABLE … ADD COLUMN`, but not for
// columns of newly created tables — this rule covers that gap.
export function findNotNullViolations(current: SchemaSnapshot): string[] {
  const violations: string[] = [];

  for (const [tableName, table] of Object.entries(current.tables)) {
    if (NON_SYNCED_TABLES.has(tableName)) {
      continue;
    }
    for (const [columnName, column] of Object.entries(table.columns)) {
      if (
        column.notNull &&
        column.defaultValue == null &&
        !column.primaryKey &&
        !NOT_NULL_EXCEPTIONS.has(`${tableName}.${columnName}`)
      ) {
        violations.push(
          `column "${tableName}.${columnName}" is NOT NULL without a default`,
        );
      }
    }
  }

  // Keep the hardcoded lists honest: a stale entry naming a table that
  // is later reintroduced as a synced table would silently disable the
  // rule for it.
  for (const tableName of NON_SYNCED_TABLES) {
    if (!current.tables[tableName]) {
      violations.push(
        `"${tableName}" in NON_SYNCED_TABLES doesn't exist in the schema — remove the stale entry`,
      );
    }
  }
  for (const exception of NOT_NULL_EXCEPTIONS) {
    const [tableName, columnName] = exception.split('.');
    const column = current.tables[tableName]?.columns[columnName];
    if (
      !column ||
      !column.notNull ||
      column.defaultValue != null ||
      column.primaryKey
    ) {
      violations.push(
        `"${exception}" in NOT_NULL_EXCEPTIONS no longer names a NOT NULL column without a default — remove the stale entry`,
      );
    }
  }

  return violations;
}

// When a breaking change is deliberately approved, the removed names are
// recorded so they can never be reused: historical CRDT sync messages
// referencing them still exist and would repopulate a reintroduced name
// with stale data.
export function computeRetiredNames(
  baseline: SchemaSnapshot,
  current: SchemaSnapshot,
): RetiredNames {
  const tables: string[] = [];
  const columns: string[] = [];

  for (const [name, baseTable] of Object.entries(baseline.tables)) {
    const currentTable = current.tables[name];
    if (!currentTable) {
      tables.push(name);
      continue;
    }
    for (const columnName of Object.keys(baseTable.columns)) {
      if (!currentTable.columns[columnName]) {
        columns.push(`${name}.${columnName}`);
      }
    }
  }

  return { tables, columns };
}

export function mergeRetiredNames(
  existing: RetiredNames,
  incoming: RetiredNames,
): RetiredNames {
  return {
    tables: [...new Set([...existing.tables, ...incoming.tables])].sort(),
    columns: [...new Set([...existing.columns, ...incoming.columns])].sort(),
  };
}

export function findRetiredNameViolations(
  retired: RetiredNames,
  current: SchemaSnapshot,
): string[] {
  const violations: string[] = [];

  for (const table of retired.tables) {
    if (current.tables[table]) {
      violations.push(`table "${table}" is retired and must not be reused`);
    }
  }

  for (const column of retired.columns) {
    const [table, columnName] = column.split('.');
    if (current.tables[table]?.columns[columnName]) {
      violations.push(`column "${column}" is retired and must not be reused`);
    }
  }

  return violations;
}
