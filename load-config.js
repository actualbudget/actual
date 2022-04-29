let config;
try {
  config = require('./config');
} catch (e) {
  let fs = require('fs');
  let { join } = require('path');
  let root = fs.existsSync('/data') ? '/data' : '/';

  config = {
    mode: 'development',
    port: 5006,
    serverFiles: join(root, 'server-files'),
    userFiles: join(root, 'user-files')
  };
}

module.exports = config;
