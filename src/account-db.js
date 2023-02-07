let fs = require('fs');
let { join } = require('path');
let { openDatabase } = require('./db');
let config = require('./load-config');
let accountDb = null;

function getAccountDb() {
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
        join(__dirname, '../sql/account.sql'),
        'utf8'
      );
      accountDb.exec(initSql);
    }
  }

  return accountDb;
}

module.exports = { getAccountDb };
