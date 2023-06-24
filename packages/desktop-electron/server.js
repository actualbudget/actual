require('./setRequireHook');
require('module').globalPaths.push(__dirname + '/..');

global.fetch = require('node-fetch');

// Lazy load backend code
function getBackend() {
  // eslint-disable-next-line import/extensions
  return require('loot-core/lib-dist/bundle.desktop.js');
}

if (process.argv[2] === '--subprocess') {
  let isDev = false;
  // let version = process.argv[3];
  let socketName = process.argv[4];

  // Start the app
  getBackend().initApp(isDev, socketName);
} else if (process.argv[2] === '--standalone') {
  require('source-map-support').install();
  getBackend().initApp(true, 'actual-standalone');
} else {
  let { ipcRenderer } = require('electron');
  let isDev = true;

  ipcRenderer.on('set-socket', (event, { name }) => {
    // Start the app
    getBackend().initApp(isDev, name);
  });
}
