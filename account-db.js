let { join } = require('path');
let { openDatabase } = require('./db');
let accountDb = null;

function getAccountDb() {
  if (accountDb == null) {
    accountDb = openDatabase(join(__dirname, 'server-files/account.sqlite'));
  }

  return accountDb;
}

module.exports = { getAccountDb };
