let config;
try {
  config = require('./config');
} catch (e) {
  let fs = require('fs');
  let { join } = require('path');
  let root = fs.existsSync('/data') ? '/data' : __dirname;

  config = {
    mode: 'development',
    port: 5006,
    hostname: '0.0.0.0',
    serverFiles: join(root, 'server-files'),
    userFiles: join(root, 'user-files')
  };
}

module.exports = config;
