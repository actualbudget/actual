const { ipcRenderer, contextBridge } = require('electron');

const { version: VERSION, isDev: IS_DEV } =
  ipcRenderer.sendSync('get-bootstrap-data');

contextBridge.exposeInMainWorld('Actual', {
  IS_DEV,
  ACTUAL_VERSION: VERSION,
  logToTerminal: (...args) => {
    require('console').log(...args);
  },

  ipcConnect: func => {
    func({
      on(name, handler) {
        return ipcRenderer.on(name, (_event, value) => handler(value));
      },
      emit(name, data) {
        return ipcRenderer.send('message', { name, args: data });
      },
    });
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

  updateAppMenu: budgetId => {
    ipcRenderer.send('update-menu', budgetId);
  },

  getServerSocket: () => {
    return null;
  },

  setTheme: theme => {
    ipcRenderer.send('set-theme', theme);
  },
});
