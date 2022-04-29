require('./setRequireHook');
require('module').globalPaths.push(__dirname + '/..');

global.fetch = require('node-fetch');

// Do this lazily so the backend code is loaded and executed after
// Sentry is installed
function getBackend() {
  return require('loot-core/lib-dist/bundle.desktop.js');
}

if (process.argv[2] === '--subprocess') {
  let isDev = false;
  let version = process.argv[3];
  let socketName = process.argv[4];

  let sentry = require('./server-sentry');
  sentry.install(version);

  // Start the app
  getBackend().initApp(version, isDev, socketName);
} else if (process.argv[2] === '--standalone') {
  require('source-map-support').install();
  getBackend().initApp('0.0.0-standalone', true, 'actual-standalone');
} else {
  let { ipcRenderer } = require('electron');
  let isDev = true;
  let versionPromise = ipcRenderer.invoke('get-version');

  ipcRenderer.on('set-socket', (event, { name }) => {
    versionPromise.then(version => {
      // Start the app
      getBackend().initApp(version, isDev, name);
    });
  });
}
