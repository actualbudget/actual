// overview:
// 1. Identify the migrations in packages/loot-core/migrations/* on `master`,
//    on the merge base, and on HEAD.
// 2. Make sure that any new migrations on HEAD are dated after the latest
//    migration on `master` (older dates trigger `out-of-sync-migrations` for
//    users who already applied the newer one).
// 3. Make sure no migration that exists on the merge base was edited or
//    deleted (shipped migrations are append-only: existing installs never
//    re-run them, so edits fork the schema across the user base).
// 4. Emit advisory warnings when a new migration contains statements that
//    look like they remove or rename schema. The authoritative gate for this
//    is the schema guard test in loot-core.
//
// See https://actualbudget.org/docs/contributing/project-details/migrations

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  findAddedMigrations,
  findMisdatedMigrations,
  findMutatedMigrations,
  findRiskyStatements,
  parseMigrationTree,
} from '../src/migrations/check';

const POLICY_URL =
  'https://actualbudget.org/docs/contributing/project-details/migrations';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'packages',
  'loot-core',
  'migrations',
);

function git(args: string[]): string {
  const { stdout } = spawnSync('git', args);
  return stdout.toString();
}

function readMigrations(ref: string) {
  const migrations = parseMigrationTree(
    git(['ls-tree', ref, migrationsDir + '/']),
  );
  console.log(`Found ${migrations.length} migrations on ${ref}.`);
  return migrations;
}

spawnSync('git', ['fetch', 'origin', 'master']);

const mergeBase =
  git(['merge-base', 'origin/master', 'HEAD']).trim() || 'origin/master';

const masterMigrations = readMigrations('origin/master');
const mergeBaseMigrations = readMigrations(mergeBase);
const headMigrations = readMigrations('HEAD');

const problems: string[] = [];

// 1. New migrations must be dated after the latest migration on master.
const latestMasterMigration =
  masterMigrations[masterMigrations.length - 1]?.id ?? 0;
const newMigrations = findAddedMigrations(masterMigrations, headMigrations);
const misdated = findMisdatedMigrations(newMigrations, latestMasterMigration);

for (const migration of misdated) {
  problems.push(
    `Migration ${migration.name} is dated before the latest migration on ` +
      `master. Rename it with a newer timestamp, otherwise users who ` +
      `already applied the newer migration will fail to load their budget.`,
  );
}

// 2. Migrations that exist on the merge base must not be edited or deleted.
const { modified, deleted } = findMutatedMigrations(
  mergeBaseMigrations,
  headMigrations,
);

for (const name of modified) {
  problems.push(
    `Migration ${name} was modified. Shipped migrations are append-only: ` +
      `existing installs will never re-run it, so editing it forks the ` +
      `database schema across the user base. Add a new migration instead.`,
  );
}
for (const name of deleted) {
  problems.push(
    `Migration ${name} was deleted. Shipped migrations are append-only: ` +
      `existing installs already ran it, so deleting it breaks the ` +
      `migration check for every existing budget file.`,
  );
}

// 3. Advisory: warn on new migrations that look like they remove or rename
// schema. Not fatal here — the schema guard test in loot-core is the
// authoritative check.
for (const migration of newMigrations) {
  let source = '';
  try {
    source = readFileSync(path.join(migrationsDir, migration.name), 'utf8');
  } catch {
    continue;
  }
  for (const risk of findRiskyStatements(source)) {
    console.log(
      `::warning file=packages/loot-core/migrations/${migration.name},` +
        `title=Possibly breaking migration::This migration ${risk}. ` +
        `Migrations must be additive-only; removing or renaming schema ` +
        `breaks older clients syncing the same budget file. See ${POLICY_URL}`,
    );
  }
}

if (problems.length) {
  console.error(`Migration policy violations found (see ${POLICY_URL}):`);
  problems.forEach(problem => {
    console.error(`  - ${problem}`);
  });
  process.exit(1);
} else {
  console.log('All migration checks passed.');
}
