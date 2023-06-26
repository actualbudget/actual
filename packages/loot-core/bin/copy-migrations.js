#!/usr/bin/env node
const { migrationUtil, join, packageRoot } = require('@actual-app/bin');

const ROOT = packageRoot('loot-core');
const DEST_DIR = join(ROOT, process.argv[2]);

async function main() {
  await migrationUtil.copyMigrations(ROOT, DEST_DIR);
}

main();
