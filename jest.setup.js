const fs = require('fs');
const { join } = require('path');
const { getAccountDb } = require('./src/account-db');
const config = require('./src/load-config');

// Delete previous test database (force creation of a new one)
const dbPath = join(config.serverFiles, 'account.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

// Create path for test user files and delete previous files there
if (fs.existsSync(config.userFiles))
  fs.rmdirSync(config.userFiles, { recursive: true });
fs.mkdirSync(config.userFiles);

// Insert a fake "valid-token" fixture that can be reused
const db = getAccountDb();
db.mutate('INSERT INTO sessions (token) VALUES (?)', ['valid-token']);
