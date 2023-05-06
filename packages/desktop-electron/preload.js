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

  relaunch: () => {
    ipcRenderer.invoke('relaunch');
  },

  openFileDialog: opts => {
    return ipcRenderer.invoke('open-file-dialog', opts);
  },

  saveFile: async (contents, filename, dialogTitle) => {
    await ipcRenderer.invoke('save-file-dialog', {
      title: dialogTitle,
      defaultPath: filename,
      fileContents: contents,
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
