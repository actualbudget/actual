#!/usr/bin/env node --trace-warnings
// @ts-strict-ignore
import * as fs from 'fs';
import * as path from 'path';

import * as sqlite from '../../platform/server/sqlite';

import {
  getMigrationsDir,
  withMigrationsDir,
  getUpMigration,
  getMigrationList,
  getAppliedMigrations,
  getPending,
  migrate,
} from './migrations';

const argv = require('yargs').options({
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
}).argv;

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

  console.log('Applied migrations:');
  applied.forEach(id => console.log('  ', getUpMigration(id, all)));

  console.log('\nPending migrations:');
  pending.forEach(name => console.log('  ', name));
}

const cmd = argv._[0];

withMigrationsDir(argv.migrationsDir || getMigrationsDir(), async () => {
  switch (cmd) {
    case 'reset':
      fs.unlinkSync(argv.db);
      const initSql = fs.readFileSync(
        path.join(__dirname, '../../../src/server/sql/init.sql'),
        'utf8',
      );
      const database = sqlite.openDatabase(argv.db);
      await sqlite.execQuery(database, initSql);
      break;
    case 'migrate':
      const applied = await migrate(sqlite.openDatabase(argv.db));
      if (applied.length === 0) {
        console.log('No pending migrations');
      } else {
        console.log('Applied migrations:\n' + applied.join('\n'));
      }
      break;
    case 'list':
      await list(sqlite.openDatabase(argv.db));
      break;
    case 'create':
    default:
      const name = argv.name;
      if (name == null || name === '') {
        console.log('Must pass a name for the new migration with --name');
        process.exit(1);
      }
      await create(name);
      break;
  }
});
