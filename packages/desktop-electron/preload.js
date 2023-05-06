const { ipcRenderer, contextBridge } = require('electron');

let { version: VERSION, isDev: IS_DEV } =
  ipcRenderer.sendSync('get-bootstrap-data');

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
    func(null);
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
      defaultPath: filename,
    });

    return new Promise((resolve, reject) => {
      let error = ipcRenderer.invoke('save-file', { fileLocation, contents });
      if (error) {
        return reject(error);
      }
      resolve();
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
  },
});
