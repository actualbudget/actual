#!/usr/bin/env node --trace-warnings
// @ts-strict-ignore
import * as fs from 'fs';
import * as path from 'path';

import yargs from 'yargs';

import { logger } from '../../platform/server/log';
import * as sqlite from '../../platform/server/sqlite';

import {
  getAppliedMigrations,
  getMigrationList,
  getMigrationsDir,
  getPending,
  getUpMigration,
  migrate,
  withMigrationsDir,
} from './migrations';

const argv = yargs()
  .options({
    m: {
      alias: 'migrationsDir',
      requiresArg: true,
      type: 'string',
      describe: 'Migrations directory',
    },
    name: {
      requiresArg: true,
      type: 'string',
      describe: 'Name of new migration',
    },
    db: {
      requiresArg: true,
      type: 'string',
      describe: 'Path to database',
    },
  })
  .parseSync();

function getDatabase() {
  return sqlite.openDatabase(argv.db);
}

function create(migrationName) {
  const migrationsDir = getMigrationsDir();
  const ts = Date.now();
  const up = path.resolve(migrationsDir, ts + '_' + migrationName + '.sql');

  fs.writeFileSync(up, 'BEGIN TRANSACTION;\n\nCOMMIT;', 'utf8');
}

async function list(db) {
  const migrationsDir = getMigrationsDir();
  const applied = await getAppliedMigrations(db);
  const all = await getMigrationList(migrationsDir);
  const pending = getPending(applied, all);

  logger.log('Applied migrations:');
  applied.forEach(id => logger.log('  ', getUpMigration(id, all)));

  logger.log('\nPending migrations:');
  pending.forEach(name => logger.log('  ', name));
}

const cmd = argv._[0];

withMigrationsDir(argv.m || getMigrationsDir(), async () => {
  switch (cmd) {
    case 'reset':
      fs.unlinkSync(argv.db);
      const initSql = fs.readFileSync(
        path.join(__dirname, '../../../src/server/sql/init.sql'),
        'utf8',
      );
      getDatabase().exec(initSql);
      break;
    case 'migrate':
      const applied = await migrate(getDatabase());
      if (applied.length === 0) {
        logger.log('No pending migrations');
      } else {
        logger.log('Applied migrations:\n' + applied.join('\n'));
      }
      break;
    case 'list':
      await list(getDatabase());
      break;
    case 'create':
    default:
      const name = argv.name;
      if (name == null || name === '') {
        logger.log('Must pass a name for the new migration with --name');
        process.exit(1);
      }
      await create(name);
      break;
  }
});
