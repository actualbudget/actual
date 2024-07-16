import { ipcRenderer, contextBridge } from 'electron';

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
  logToTerminal: (...args: unknown[]) => {
    console.log(...args);
  },

  ipcConnect: func => {
    func({
      on(name: string, handler: (payload: unknown) => void) {
        return ipcRenderer.on(name, (_event, value) => handler(value));
      },
      emit(name: string, data: unknown) {
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
