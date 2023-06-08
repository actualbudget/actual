#!/usr/bin/env node

// overview:
// 1. List all migrations in packages/loot-core/migrations/*
// 2. Check the commit that created the migration file
// 3. Make sure that newer migrations were committed after older migrations (by date in the migration name)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Please don’t add to this list, we just can’t change this migration ID since it already happened
const exceptions = ['1679728867040_rules_conditions.sql'];

const migrationsDir = path.join(
  __dirname,
  '..',
  '..',
  'packages',
  'loot-core',
  'migrations',
);

const migrations = fs
  .readdirSync(migrationsDir)
  .filter(file => !file.startsWith('.'))
  .map(file => {
    const [_, date] = file.match(/^(\d+)_/) || [];
    const { stdout } = spawnSync('git', [
      'log',
      '--format=%ct',
      '-n',
      '1',
      path.join(migrationsDir, file),
    ]);
    return {
      migrationDate: parseInt(date),
      commitDate: parseInt(stdout) * 1000,
      file,
    };
  });

const sortedMigrations = migrations.sort(
  (a, b) => a.migrationDate - b.migrationDate,
);

let ok = true;
for (let i = sortedMigrations.length - 1; i > 0; i--) {
  const migration = sortedMigrations[i];
  const prevMigration = sortedMigrations[i - 1];
  if (migration.commitDate < prevMigration.commitDate) {
    if (exceptions.includes(migration.file)) {
      continue;
    }
    console.error(
      `error: migration ${migration.file} was committed before ${prevMigration.file}, but it has a later date in the filename`,
    );
    ok = false;
  }
}

if (ok) {
  console.log('All migration IDs are in order');
} else {
  console.error(
    '\nMigrations must be ordered by date or they will fail to apply properly',
  );
  process.exit(1);
}
