#!/usr/bin/env node --trace-warnings
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

let argv = require('yargs').options({
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

function getDatabase() {
  return sqlite.openDatabase(argv.db);
}

function create(migrationName) {
  let migrationsDir = getMigrationsDir();
  let ts = Date.now();
  let up = path.resolve(migrationsDir, ts + '_' + migrationName + '.sql');

  fs.writeFileSync(up, 'BEGIN TRANSACTION;\n\nCOMMIT;', 'utf8');
}

async function list(db) {
  let migrationsDir = getMigrationsDir();
  let applied = await getAppliedMigrations(getDatabase());
  let all = await getMigrationList(migrationsDir);
  let pending = getPending(applied, all);

  console.log('Applied migrations:');
  applied.forEach(id => console.log('  ', getUpMigration(id, all)));

  console.log('\nPending migrations:');
  pending.forEach(name => console.log('  ', name));
}

let cmd = argv._[0];

withMigrationsDir(argv.migrationsDir || getMigrationsDir(), async () => {
  switch (cmd) {
    case 'reset':
      fs.unlinkSync(argv.db);
      let initSql = fs.readFileSync(
        path.join(__dirname, '../../../src/server/sql/init.sql'),
        'utf8',
      );
      getDatabase().exec(initSql);
      break;
    case 'migrate':
      let applied = await migrate(getDatabase());
      if (applied.length === 0) {
        console.log('No pending migrations');
      } else {
        console.log('Applied migrations:\n' + applied.join('\n'));
      }
      break;
    case 'list':
      await list(getDatabase());
      break;
    case 'create':
    default:
      let name = argv.name;
      if (name == null || name === '') {
        console.log('Must pass a name for the new migration with --name');
        process.exit(1);
      }
      await create(name);
      break;
  }
});
