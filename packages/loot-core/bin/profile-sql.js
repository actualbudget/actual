#!/usr/bin/env actual-cli-runner.js
import fs from 'fs';
import os from 'os';
import * as sqlite from '../src/platform/server/sqlite';
import * as db from '../src/server/db';
import { batchMessages, setSyncingMode } from '../src/server/sync';
import { runQuery } from '../src/server/aql';
import asyncStorage from '../src/platform/server/asyncStorage';
import { makeChild } from '../src/shared/transactions';
import q from '../src/shared/query';

let dbPath = process.argv[3];

if (dbPath == null || dbPath === '') {
  console.log('db path is required');
  process.exit(1);
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}

async function init() {
  asyncStorage.init();
  setSyncingMode('disabled');

  let tempPath = os.tmpdir() + '/db-profile.sql';
  fs.copyFileSync(dbPath, tempPath);

  db.setDatabase(sqlite.openDatabase(tempPath));

  let accounts = await db.getAccounts();

  await batchMessages(() => {
    for (let i = 0; i < 100; i++) {
      if (Math.random() < 0.02) {
        let parent = {
          date: '2020-01-' + pad(Math.floor(Math.random() * 30)),
          amount: Math.floor(Math.random() * 10000),
          account: accounts[0].id,
          notes: 'foo'
        };
        db.insertTransaction(parent);
        db.insertTransaction(
          makeChild(parent, {
            amount: Math.floor(Math.random() * 1000) 
          })
        );
        db.insertTransaction(
          makeChild(parent, {
            amount: Math.floor(Math.random() * 1000) 
          })
        );
        db.insertTransaction(
          makeChild(parent, {
            amount: Math.floor(Math.random() * 1000) 
          })
        );
      } else {
        db.insertTransaction({
          date: '2020-01-' + pad(Math.floor(Math.random() * 30)),
          amount: Math.floor(Math.random() * 10000),
          account: accounts[0].id
        });
      }
    }
  });

  // full: 12647
  // paged: 431

  await db.execQuery('SELECT * FROM transactions');
  await db.execQuery('SELECT * FROM transactions');
  await db.execQuery('SELECT * FROM transactions');
  await db.execQuery('SELECT * FROM transactions');
  await db.execQuery('SELECT * FROM transactions');
  await db.execQuery('SELECT * FROM transactions');
  await db.execQuery('SELECT * FROM transactions');
  await db.execQuery('SELECT * FROM transactions');

  // await db.execQuery('PRAGMA journal_mode = WAL');

  // console.log(
  //   await db.all(
  //     'SELECT * FROM v_transactions_layer2 WHERE v_transactions_layer2.account = "foo"'
  //   )
  // );

  console.log('starting');
  let s = Date.now();
  let { data } = await runQuery(
    q('transactions')
      .select('*')
      .options({ splits: 'grouped' })
      .serialize()
  );
  console.log('# items:', data.length);
  console.log('time:', Date.now() - s);

  // for (let i = 0; i < accounts.length; i++) {
  //   let s = Date.now();
  //   // let data = await runQuery(
  //   //   q('transactions')
  //   //     .filter({ account: accounts[i].id })
  //   //     .calculate({ $sum: '$amount' })
  //   //     .serialize()
  //   // );
  //   let rows = db.runQuery(
  //     `SELECT SUM(amount) as total FROM v_transactions_layer2 WHERE account = "${accounts[i].id}"`,
  //     [],
  //     true
  //   );
  //   console.log('Total:', rows[0]);
  //   console.log('Time:', Date.now() - s);
  // }

  // console.log(data);
}

init();
