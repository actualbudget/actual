import { ipcRenderer, contextBridge, IpcRenderer } from 'electron';

import {
  GetBootstrapDataPayload,
  OpenFileDialogPayload,
  SaveFileDialogPayload,
} from './index';

const { version: VERSION, isDev: IS_DEV }: GetBootstrapDataPayload =
  ipcRenderer.sendSync('get-bootstrap-data');

contextBridge.exposeInMainWorld('Actual', {
  IS_DEV,
  ACTUAL_VERSION: VERSION,
  DATA_DIR: process.env.ACTUAL_DATA_DIR,
  logToTerminal: console.log,

  ipcConnect: (
    func: (payload: {
      on: IpcRenderer['on'];
      emit: (name: string, data: unknown) => void;
    }) => void,
  ) => {
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

  openFileDialog: (opts: OpenFileDialogPayload) => {
    return ipcRenderer.invoke('open-file-dialog', opts);
  },

  saveFile: async (
    contents: SaveFileDialogPayload['fileContents'],
    filename: SaveFileDialogPayload['defaultPath'],
    dialogTitle: SaveFileDialogPayload['title'],
  ) => {
    await ipcRenderer.invoke('save-file-dialog', {
      title: dialogTitle,
      defaultPath: filename,
      fileContents: contents,
    });
  },

  openURLInBrowser: (url: string) => {
    ipcRenderer.invoke('open-external-url', url);
  },

  onEventFromMain: (type: string, handler: (...args: unknown[]) => void) => {
    ipcRenderer.on(type, handler);
  },

  updateAppMenu: (budgetId?: string) => {
    ipcRenderer.send('update-menu', budgetId);
  },

  getServerSocket: () => {
    return null;
  },

  setTheme: (theme: string) => {
    ipcRenderer.send('set-theme', theme);
  },
});
