#!/usr/bin/env node

// overview:
// 1. Identify the migrations in packages/loot-core/migrations/* on `master` and HEAD
// 2. Make sure that any new migrations on HEAD are dated after the latest migration on `master`.

const { spawnSync } = require('child_process');
const path = require('path');

const migrationsDir = path.join(
  __dirname,
  '..',
  '..',
  'packages',
  'loot-core',
  'migrations',
);

function readMigrations(ref) {
  const { stdout } = spawnSync('git', [
    'ls-tree',
    '--name-only',
    ref,
    migrationsDir + '/',
  ]);
  const files = stdout.toString().split('\n').filter(Boolean);
  console.log(`Found ${files.length} migrations on ${ref}.`);
  return files
    .map(file => path.basename(file))
    .filter(file => !file.startsWith('.'))
    .map(name => ({
      date: parseInt(name.split('_')[0]),
      name: name.match(/^\d+_(.+?)(\.sql)?$/)?.[1] ?? '***' + name,
    }));
}

spawnSync('git', ['fetch', 'origin', 'master']);
const masterMigrations = readMigrations('origin/master');
const headMigrations = readMigrations('HEAD');

const latestMasterMigration =
  masterMigrations[masterMigrations.length - 1].date;
const newMigrations = headMigrations.filter(
  migration => !masterMigrations.find(m => m.name === migration.name),
);
const badMigrations = newMigrations.filter(
  migration => migration.date <= latestMasterMigration,
);

if (badMigrations.length) {
  console.error(
    `The following migrations are dated before the latest migration on master:`,
  );
  badMigrations.forEach(migration => {
    console.error(`  ${migration.name}`);
  });
  process.exit(1);
} else {
  console.log(`All migrations are dated after the latest migration on master.`);
}
