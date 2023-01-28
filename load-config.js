let config;
try {
  // @ts-expect-error TS2307: we expect this file may not exist
  config = require('./config');
} catch (e) {
  let fs = require('fs');
  let { join } = require('path');
  let root = fs.existsSync('/data') ? '/data' : __dirname;

  if (process.env.NODE_ENV === 'test') {
    config = {
      mode: 'test',
      port: 5006,
      hostname: '0.0.0.0',
      serverFiles: join(__dirname, 'test-server-files'),
      userFiles: join(__dirname, 'test-user-files')
    };
  } else {
    config = {
      mode: 'development',
      port: 5006,
      hostname: '0.0.0.0',
      serverFiles: join(root, 'server-files'),
      userFiles: join(root, 'user-files')
    };
  }
}

// The env variable always takes precedence
config.userFiles = process.env.ACTUAL_USER_FILES || config.userFiles;

module.exports = config;
