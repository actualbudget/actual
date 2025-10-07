// @ts-strict-ignore
import md5 from 'md5';

import { schema, schemaConfig, makeViews } from './aql';
import * as db from './db';
import * as migrations from './migrate/migrations';

// Managing the init/update process

async function runMigrations() {
  await migrations.migrate(db.getDatabase());
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

export async function updateVersion() {
  await runMigrations();
  await updateViews();
}
