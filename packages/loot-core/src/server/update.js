import md5 from 'md5';
import * as migrations from './migrate/migrations';
import * as db from './db';
import { schema, schemaConfig } from './aql/schema';
import { makeViews } from './aql/views';

// Managing the init/update process

async function runMigrations() {
  await migrations.migrate(db.getDatabase());
}

export async function updateViews() {
  let hashKey = 'view-hash';
  let row = await db.first('SELECT value FROM __meta__ WHERE key = ?', [
    hashKey
  ]);
  let { value: hash } = row || {};

  let views = makeViews(schema, schemaConfig);
  let currentHash = md5(views);

  if (hash !== currentHash) {
    await db.execQuery(views);
    await db.runQuery(
      'INSERT OR REPLACE INTO __meta__ (key, value) VALUES (?, ?)',
      [hashKey, currentHash]
    );
  }
}

export async function updateVersion() {
  await runMigrations();
  await updateViews();
}
