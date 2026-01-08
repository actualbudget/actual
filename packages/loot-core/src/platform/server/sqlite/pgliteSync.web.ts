import { sql } from 'drizzle-orm';

import * as db from '../../../server/db';
import { actualSchema } from '../../../server/db/schema';
import * as dbUtil from '../../../server/db/util';
import * as pglite from '../pglite';

import * as sqlite from '.';
import { logger } from '../log';

// These have been renamed in the PGlite schema so that
// they match the rest of the schema which is snake_case.
const RENAMED_COLUMNS = new Map([
  ['targetId', 'target_id'],
  ['transferId', 'transfer_id'],
  ['isParent', 'is_parent'],
  ['isChild', 'is_child'],
]);

export function pgliteSync(
  table: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  primaryKeyColumn: string,
  primaryKeyValue: string,
) {
  // Default to id.
  primaryKeyColumn = primaryKeyColumn || 'id';

  console.log(
    'pgliteSync',
    table,
    operation,
    primaryKeyColumn,
    primaryKeyValue,
  );

  switch (operation) {
    case 'INSERT':
    case 'UPDATE':
      insertOrUpdateRow(table, primaryKeyColumn, primaryKeyValue);
      break;
    case 'DELETE':
      deleteRow(table, primaryKeyColumn, primaryKeyValue);
      break;
    default:
      return 0;
  }

  return 1;
}

async function insertOrUpdateRow(
  table: string,
  primaryKeyColumn: string,
  primaryKeyValue: string,
): Promise<void> {
  const pgliteDb = await pglite.openDatabase();
  // Get from sqlite.
  const sqliteDb = db.getDatabase();
  if (!sqliteDb) {
    logger.warn('No sqlite database found for pglite sync');
    return;
  }

  const [row] = await sqlite.runQuery<Record<string, unknown>>(
    sqliteDb,
    `SELECT * FROM ${table} WHERE ${primaryKeyColumn} = ?`,
    [primaryKeyValue],
    true,
  );

  if (!row) {
    console.warn(
      `${table} row not found in sqlite with ${primaryKeyColumn}: ${primaryKeyValue}`,
    );
    return;
  }

  console.log(`${table} row from sqlite:`, JSON.stringify(row));

  const columnNames = Object.keys(row).map(column => {
    const renamedColumn = RENAMED_COLUMNS.get(column);
    return renamedColumn ? renamedColumn : column;
  });

  const columns = sql.join(
    columnNames.map(column => sql.identifier(column)),
    sql`,`,
  );

  const values = sql.join(
    Object.values(row).map(value => sql`${value}`),
    sql`,`,
  );

  const updateValues = sql.join(
    columnNames
      // No need to update the id column.
      .filter(column => column !== primaryKeyColumn)
      .map(
        column => sql`${sql.identifier(column)} = ${dbUtil.excluded(column)}`,
      ),
    sql`,`,
  );

  try {
    await pgliteDb.execute(sql`
      INSERT INTO ${actualSchema}.${sql.identifier(table)} (${columns}) VALUES (${values})
      ON CONFLICT (${sql.identifier(primaryKeyColumn)}) DO UPDATE SET ${updateValues}
    `);

    const { rows } = await pgliteDb.execute(sql`
      SELECT * FROM ${actualSchema}.${sql.identifier(table)}
      WHERE ${sql.identifier(primaryKeyColumn)} = ${primaryKeyValue}
    `);

    console.log(
      `${table} row inserted/updated in PGlite:`,
      JSON.stringify(rows[0]),
    );
  } catch (err) {
    console.error(
      `Error inserting/updating ${table} row in PGlite with ${primaryKeyColumn}: ${primaryKeyValue}`,
      err,
    );
  }
}

async function deleteRow(
  table: string,
  primaryKeyColumn: string,
  primaryKeyValue: string,
): Promise<void> {
  console.log(`Deleting row with ${primaryKeyColumn}:`, primaryKeyValue);
  const pgliteDb = await pglite.openDatabase();
  try {
    await pgliteDb.execute(sql`
      DELETE FROM ${actualSchema}.${sql.identifier(table)}
      WHERE ${sql.identifier(primaryKeyColumn)} = ${primaryKeyValue}
    `);
    console.log(
      `${table} row deleted from PGlite with ${primaryKeyColumn}:`,
      primaryKeyValue,
    );
  } catch (err) {
    console.error(
      `Error deleting ${table} row in PGlite with ${primaryKeyColumn}: ${primaryKeyValue}`,
      err,
    );
  }
}
