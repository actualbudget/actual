// @ts-strict-ignore
import md5 from 'md5';

import * as pglite from '../platform/server/pglite';

import { schema, schemaConfig, makeViews } from './aql';
import * as db from './db';
import {
  categoriesTable,
  categoryGroupsTable,
  categoryMappingTable,
} from './db/schema';
import * as migrations from './migrate/migrations';

// Managing the init/update process

async function runMigrations() {
  await migrations.migrate(db.getDatabase());
  await migrations.migratePGlite(await pglite.openDatabase());
}

async function updateViews() {
  const hashKey = 'view-hash';
  const row = await db.first<{ value: string }>(
    'SELECT value FROM __meta__ WHERE key = ?',
    [hashKey],
  );
  const { value: hash } = row || {};

  const views = makeViews(schema, schemaConfig);
  const currentHash = md5(views);

  if (hash !== currentHash) {
    await db.execQuery(views);
    await db.runQuery(
      'INSERT OR REPLACE INTO __meta__ (key, value) VALUES (?, ?)',
      [hashKey, currentHash],
    );
  }
}

// Seed pglite database with initial data that is same as the
// data in the default sqlite database.
async function seedPGlite() {
  const categoryGroups = await db.all<db.DbCategoryGroup>(
    'SELECT * FROM category_groups WHERE tombstone = 0',
  );
  const categories = await db.all<db.DbCategory>(
    'SELECT * FROM categories WHERE tombstone = 0',
  );
  const categoryMappings = await db.all<db.DbCategoryMapping>(
    'SELECT * FROM category_mapping',
  );

  const pgliteDb = await pglite.openDatabase();

  await pgliteDb
    .insert(categoryGroupsTable)
    .values(
      categoryGroups.map(
        cg =>
          ({
            id: cg.id,
            name: cg.name,
            sortOrder: cg.sort_order,
            tombstone: cg.tombstone ? true : false,
            isIncome: cg.is_income ? true : false,
            hidden: cg.hidden ? true : false,
          }) as typeof categoryGroupsTable.$inferInsert,
      ),
    )
    .onConflictDoNothing();

  await pgliteDb
    .insert(categoriesTable)
    .values(
      categories.map(
        c =>
          ({
            id: c.id,
            name: c.name,
            catGroup: c.cat_group,
            sortOrder: c.sort_order,
            hidden: c.hidden ? true : false,
            isIncome: c.is_income ? true : false,
            goalDef: c.goal_def,
            tombstone: c.tombstone ? true : false,
          }) as typeof categoriesTable.$inferInsert,
      ),
    )
    .onConflictDoNothing();

  await pgliteDb
    .insert(categoryMappingTable)
    .values(
      categoryMappings.map(
        c =>
          ({
            id: c.id,
            transferId: c.transferId,
          }) as typeof categoryMappingTable.$inferInsert,
      ),
    )
    .onConflictDoNothing();
}

export async function updateVersion() {
  await runMigrations();
  await updateViews();
  await seedPGlite();
}
