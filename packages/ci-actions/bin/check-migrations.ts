// overview: identify the migrations in packages/loot-core/migrations/* on
// `master`, on the merge base, and on HEAD, then:
// 1. Make sure that any new migrations on HEAD are dated after the latest
//    migration on `master` (older dates trigger `out-of-sync-migrations` for
//    users who already applied the newer one).
// 2. Make sure no migration that exists on the merge base was edited or
//    deleted (shipped migrations are append-only: existing installs never
//    re-run them, so edits fork the schema across the user base).
// 3. Emit advisory warnings when a new migration contains statements that
//    look like they remove or rename schema (removing or renaming breaks
//    older clients syncing the same budget file). The warnings are also
//    written to migration-warnings.json so the migration-warnings-comment
//    workflow can surface them as a PR comment.
//
// See https://actualbudget.org/docs/contributing/project-details/migrations

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
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
  const { status, stdout, stderr, error } = spawnSync('git', args);
  if (error) {
    throw error;
  }
  if (status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed (exit ${status}): ${stderr.toString()}`,
    );
  }
  return stdout.toString();
}

function readMigrations(ref: string) {
  const migrations = parseMigrationTree(
    git(['ls-tree', ref, migrationsDir + '/']),
  );
  console.log(`Found ${migrations.length} migrations on ${ref}.`);
  return migrations;
}

git(['fetch', 'origin', 'master']);

const mergeBase = git(['merge-base', 'origin/master', 'HEAD']).trim();

const masterMigrations = readMigrations('origin/master');
const mergeBaseMigrations = readMigrations(mergeBase);
const headMigrations = readMigrations('HEAD');

const problems: string[] = [];

// 1. New migrations must be dated after the latest migration on master.
const latestMasterMigration = Math.max(
  0,
  ...masterMigrations.map(migration => migration.id),
);
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
// schema. Not fatal — regexes over SQL can't be authoritative, so this only
// surfaces an early hint on the PR.
const riskyMigrations: { name: string; risks: string[] }[] = [];
for (const migration of newMigrations) {
  let source = '';
  try {
    source = readFileSync(path.join(migrationsDir, migration.name), 'utf8');
  } catch {
    continue;
  }
  const risks = findRiskyStatements(source);
  for (const risk of risks) {
    console.log(
      `::warning file=packages/loot-core/migrations/${migration.name},` +
        `title=Possibly breaking migration::This migration ${risk}. ` +
        `Migrations must be additive-only; removing or renaming schema ` +
        `breaks older clients syncing the same budget file. See ${POLICY_URL}`,
    );
  }
  if (risks.length) {
    riskyMigrations.push({ name: migration.name, risks });
  }
}

// The warnings above don't fail the job, so they're easy to miss. Hand them
// to the migration-warnings-comment workflow (whose token can comment on
// fork PRs) via an artifact. Always written — an empty list tells the
// workflow to remove a stale comment once the warnings are resolved.
writeFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'migration-warnings.json',
  ),
  JSON.stringify(riskyMigrations),
);

if (problems.length) {
  console.error(`Migration policy violations found (see ${POLICY_URL}):`);
  problems.forEach(problem => {
    console.error(`  - ${problem}`);
  });
  process.exit(1);
} else {
  console.log('All migration checks passed.');
}
