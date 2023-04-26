#!/usr/bin/env node
import * as fs from 'fs';

import * as db from './db';

const queries = fs
  .readFileSync(__dirname + '/../../src/server/slow-queries.txt', 'utf8')
  .split('___BOUNDARY')
  .map(q => q.trim());

function runQueries(n?) {
  for (let i = 0; i < queries.length; i++) {
    if (queries[i] !== '') {
      db.runQuery(queries[i], [], true);
    }
  }
}

async function run() {
  await db.openDatabase();
  const start = Date.now();
  runQueries();
  console.log(Date.now() - start);
}

run();
