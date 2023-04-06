import fs from 'node:fs';
import { join } from 'node:path';
import openDatabase from './db.js';
import config, { sqlDir } from './load-config.js';
import createDebug from 'debug';

const debug = createDebug('actual:account-db');

let accountDb = null;

export default function getAccountDb() {
  if (accountDb == null) {
    if (!fs.existsSync(config.serverFiles)) {
      debug(`creating server files directory: '${config.serverFiles}'`);
      fs.mkdirSync(config.serverFiles);
    }

    let dbPath = join(config.serverFiles, 'account.sqlite');
    let needsInit = !fs.existsSync(dbPath);

    accountDb = openDatabase(dbPath);

    if (needsInit) {
      debug(`initializing account database: '${dbPath}'`);
      let initSql = fs.readFileSync(join(sqlDir, 'account.sql'), 'utf8');
      accountDb.exec(initSql);
    } else {
      debug(`opening account database: '${dbPath}'`);
    }
  }

  return accountDb;
}
