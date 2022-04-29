let config;
try {
  config = require('./config');
} catch (e) {
  let fs = require('fs');

  config = {
    mode: 'development',
    port: 5006,
    files: fs.existsSync('/data') ? '/data' : './user-files'
  };
}

module.exports = config;
