// @ts-strict-ignore
import { createHash } from 'node:crypto';

import { logger } from '#platform/server/log';

import { makeViews, schema, schemaConfig } from './aql';
import * as db from './db';
import * as migrations from './migrate/migrations';

// Managing the init/update process

async function runMigrations() {
  await migrations.migrate(db.getDatabase());
}

// `'fields'` is a non-view entry inside each table's view map, shared with
// `makeViews` — skip it.
function getConfiguredViewNames(): string[] {
  return Object.values(schemaConfig.views).flatMap(tableViews =>
    Object.keys(tableViews).filter(name => name !== 'fields'),
  );
}

// Fail fast when the newly-created views reference columns the migrations
// didn't add, so the user hits the recovery dialog once at startup instead of
// a cryptic error on every UI query.
function probeViews(): void {
  for (const viewName of getConfiguredViewNames()) {
    try {
      db.execQuery(`SELECT * FROM ${viewName} LIMIT 0`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error(`View ${viewName} failed schema probe`, e);
      throw new Error(`schema-out-of-sync: ${viewName}: ${message}`);
    }
  }
}

async function updateViews() {
  const hashKey = 'view-hash';
  const row = await db.first<{ value: string }>(
    'SELECT value FROM __meta__ WHERE key = ?',
    [hashKey],
  );
  const { value: hash } = row || {};

  const views = makeViews(schema, schemaConfig);
  const currentHash = createHash('md5').update(views).digest('hex');

  if (hash !== currentHash) {
    db.execQuery(views);
    db.runQuery('INSERT OR REPLACE INTO __meta__ (key, value) VALUES (?, ?)', [
      hashKey,
      currentHash,
    ]);
    probeViews();
  }
}

export async function updateVersion() {
  await runMigrations();
  await updateViews();
}
