require('./setRequireHook');
require('module').globalPaths.push(__dirname + '/..');

global.fetch = require('node-fetch');

// Lazy load backend code
function getBackend() {
  // eslint-disable-next-line import/extensions
  return require('loot-core/lib-dist/bundle.desktop.js');
}

const isDev = false;

// Start the app
getBackend().initApp(isDev);
