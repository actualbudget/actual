#!/usr/bin/env ts-node
import * as fs from 'fs';

import { init, shutdown } from '@actual-app/api';

import { importBuffer } from './importer';

async function run() {
  let filepath = process.argv[2];
  let buffer = fs.readFileSync(filepath);

  await init();
  await importBuffer(filepath, buffer);
  await shutdown();
}

run();
