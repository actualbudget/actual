#!/usr/bin/env node
const fs = require('fs');

const { init, shutdown } = require('@actual-app/api');

const { importBuffer } = require('./importer');

async function run() {
  let filepath = process.argv[2];
  let buffer = fs.readFileSync(filepath);

  await init();
  await importBuffer(filepath, buffer);
  await shutdown();
}

run();
