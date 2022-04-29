let config;
try {
  config = require('./config');
} catch (e) {
  config = {
    mode: 'development',
    port: 5006,
    files: './user-files'
  };
}

module.exports = config;
