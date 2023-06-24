#!usr/bin/env node
const Path = require('path');

const migrationUtil = require('./migration-util');

const ROOT = process.cwd(); //Make path consistent with bash
const DATA_DIR = Path.join(ROOT, process.argv[2]);

async function main() {
  await migrationUtil.copyMigrations(ROOT, DATA_DIR);
}

main();
