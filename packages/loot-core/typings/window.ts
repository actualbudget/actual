// @ts-strict-ignore
import { type NavigateFunction } from 'react-router';

export {};

type FileDialogOptions = {
  properties?: Array<'openFile' | 'openDirectory'>;
  filters?: {
    name: string;
    extensions: string[];
  }[];
};

type Actual = {
  IS_DEV: boolean;
  ACTUAL_VERSION: string;
  openURLInBrowser: (url: string) => void;
  openInFileManager: (filepath: string) => void;
  saveFile: (
    contents: string | Buffer,
    filename: string,
    dialogTitle?: string,
  ) => Promise<void>;
  openFileDialog: (options: FileDialogOptions) => Promise<string[]>;
  relaunch: () => void;
  reload: (() => Promise<void>) | undefined;
  restartElectronServer: () => void;
  moveBudgetDirectory: (
    currentBudgetDirectory: string,
    newDirectory: string,
  ) => Promise<void>;
  applyAppUpdate: () => Promise<void>;
  ipcConnect: (callback: (client) => void) => void;
  getServerSocket: () => Promise<Worker | null>;
  setTheme: (theme: string) => void;
  logToTerminal: (...args: unknown[]) => void;
  onEventFromMain: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  isUpdateReadyForDownload: () => boolean;
  waitForUpdateReadyForDownload: () => Promise<void>;
  startSyncServer: () => Promise<void>;
  stopSyncServer: () => Promise<void>;
  isSyncServerRunning: () => Promise<boolean>;
  startOAuthServer: () => Promise<string>;
};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    __navigate?: NavigateFunction;
  }

  var Actual: Actual;

  var IS_TESTING: boolean;

  var currentMonth: string | null;
}
