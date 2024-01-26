const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');

// Every 5 minutes
const INTERVAL = 1000 * 60 * 5;
let updateTimer = null;
let isCheckingForUpdates = false;
let emitEvent = null;
let lastEvent;

autoUpdater.on('checking-for-update', () => {
  isCheckingForUpdates = true;
  fireEvent('update-checking');
});

autoUpdater.on('update-available', () => {
  fireEvent('update-available');
});

autoUpdater.on('update-downloaded', info => {
  fireEvent('update-downloaded', {
    releaseNotes: info.releaseNotes,
    releaseName: info.releaseName,
    version: info.version,
  });
});

autoUpdater.on('update-not-available', () => {
  isCheckingForUpdates = false;
  fireEvent('update-not-available');
});

autoUpdater.on('error', message => {
  isCheckingForUpdates = false;
  // This is a common error, so don't report it. All sorts of reasons
  // why this can user that isn't our fault.
  console.log('There was a problem updating the application: ' + message);
  fireEvent('update-error', message);
});

function fireEvent(type, args) {
  emitEvent?.(type, args);
  lastEvent = type;
}

function start() {
  if (updateTimer) {
    return null;
  }

  if (!isDev) {
    console.log('Starting autoupdate check...');

    updateTimer = setInterval(() => {
      if (!isCheckingForUpdates) {
        autoUpdater.checkForUpdates().catch(() => {
          // Do nothing with the error (make sure it's not logged to sentry)
        });
      }
    }, INTERVAL);
  }
}

function onEvent(handler) {
  emitEvent = handler;
}

function stop() {
  console.log('Stopping autoupdate check...');

  clearInterval(updateTimer);
  updateTimer = null;
}

function check() {
  if (!isDev && !isCheckingForUpdates) {
    autoUpdater.checkForUpdates().catch(() => {
      // Do nothing with the error (make sure it's not logged to sentry)
    });
  }
}

function isChecking() {
  return isCheckingForUpdates;
}

function getLastEvent() {
  return lastEvent;
}

function apply() {
  autoUpdater.quitAndInstall();
}

module.exports = {
  start,
  stop,
  onEvent,
  apply,
  check,
  isChecking,
  getLastEvent,
};
