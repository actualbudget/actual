require('./setRequireHook');
require('module').globalPaths.push(__dirname + '/..');

global.fetch = require('node-fetch');

// Lazy load backend code
function getBackend() {
  // eslint-disable-next-line import/extensions
  return require('loot-core/lib-dist/bundle.desktop.js');
}

if (process.argv[2] === '--subprocess') {
  const isDev = false;

  // Start the app
  getBackend().initApp(isDev);
} else if (process.argv[2] === '--standalone') {
  require('source-map-support').install();
  getBackend().initApp(true, 'actual-standalone');
} else {
  const { ipcRenderer } = require('electron');
  const isDev = true;

  ipcRenderer.on('set-socket', (event, { name }) => {
    // Start the app
    getBackend().initApp(isDev, name);
  });
}
