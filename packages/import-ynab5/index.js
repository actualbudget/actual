#!/usr/bin/env node
const fs = require('fs');

const { init, shutdown } = require('@actual-app/api');

const { importYNAB5 } = require('./importer');

async function run() {
  let filepath = process.argv[2];
  let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  await init();
  await importYNAB5(data);
  await shutdown();
}

run();
