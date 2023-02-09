import fs from 'node:fs';
import { join } from 'node:path';
import openDatabase from './db.js';
import config, { projectRoot } from './load-config.js';
let accountDb = null;

export default function getAccountDb() {
  if (accountDb == null) {
    if (!fs.existsSync(config.serverFiles)) {
      console.log('MAKING SERVER DIR');
      fs.mkdirSync(config.serverFiles);
    }

    let dbPath = join(config.serverFiles, 'account.sqlite');
    let needsInit = !fs.existsSync(dbPath);

    accountDb = openDatabase(dbPath);

    if (needsInit) {
      let initSql = fs.readFileSync(
        join(projectRoot, 'sql/account.sql'),
        'utf8'
      );
      accountDb.exec(initSql);
    }
  }

  return accountDb;
}
