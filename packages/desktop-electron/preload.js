const { ipcRenderer, contextBridge } = require('electron');
const SentryClient = require('@sentry/electron');
const ipc = require('node-ipc');
const fs = require('fs');

let { version: VERSION, isDev: IS_DEV } = ipcRenderer.sendSync(
  'get-bootstrap-data'
);

if (!IS_DEV) {
  // This just inits the IPC bridge for sending events from the renderer process
  // back to the main process
  SentryClient.init({
    dsn:
      'https://f2fa901455894dc8bf28210ef1247e2d:b9e69eb21d9740539b3ff593f7346396@sentry.io/261029',
    release: VERSION
  });
}

let resolveSocketPromise;
let socketPromise = new Promise(resolve => {
  resolveSocketPromise = resolve;
});

ipcRenderer.on('set-socket', (event, { name }) => {
  resolveSocketPromise(name);
});

contextBridge.exposeInMainWorld('Actual', {
  IS_DEV,
  ACTUAL_VERSION: VERSION,
  logToTerminal: (...args) => {
    require('console').log(...args);
  },

  ipcConnect: (id, func) => {
    ipc.config.silent = true;
    ipc.connectTo(id, () => {
      let client = ipc.of[id];

      func({
        on(name, handler) {
          return client.on(name, handler);
        },
        emit(name, data) {
          return client.emit(name, data);
        }
      });
    });
  },

  relaunch: () => {
    ipcRenderer.invoke('relaunch');
  },

  openFileDialog: opts => {
    return ipcRenderer.invoke('open-file-dialog', opts);
  },

  saveFile: async (contents, filename, dialogTitle) => {
    const fileLocation = await ipcRenderer.invoke('save-file-dialog', {
      title: dialogTitle,
      defaultPath: filename
    });

    return new Promise((resolve, reject) => {
      if (fileLocation) {
        fs.writeFile(fileLocation, contents, error => {
          if (error) {
            return reject(error);
          }

          resolve();
        });
      }
    });
  },

  openURLInBrowser: url => {
    ipcRenderer.invoke('open-external-url', url);
  },

  onEventFromMain: (type, handler) => {
    ipcRenderer.on(type, handler);
  },

  applyAppUpdate: () => {
    ipcRenderer.send('apply-update');
  },

  updateAppMenu: isBudgetOpen => {
    ipcRenderer.send('update-menu', isBudgetOpen);
  },

  getServerSocket: () => {
    return socketPromise;
  }
});
