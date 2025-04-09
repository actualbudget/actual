export {};

type Actual = {
  IS_DEV: boolean;
  ACTUAL_VERSION: string;
  openURLInBrowser: (url: string) => void;
  saveFile: (
    contents: string | Buffer,
    filename: string,
    dialogTitle?: string,
  ) => Promise<void>;
  openFileDialog: (options) => Promise<string[]>;
  relaunch: () => void;
  reload: (() => Promise<void>) | undefined;
  restartElectronServer: () => void;
  moveBudgetDirectory: (
    currentBudgetDirectory: string,
    newDirectory: string,
  ) => Promise<void>;
  applyAppUpdate: () => Promise<void>;
  updateAppMenu: (budgetId: string) => void;
  ipcConnect: (callback: (client) => void) => void;
  getServerSocket: () => Promise<string | null>;
  setTheme: (theme: string) => void;
  logToTerminal: (...args: unknown[]) => void;
  onEventFromMain: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  isUpdateReadyForDownload: () => boolean;
  waitForUpdateReadyForDownload: () => Promise<void>;
  startOAuthServer: () => Promise<string>;
};

declare global {
  interface Window {
    __navigate?: import('react-router').NavigateFunction;
  }

  // eslint-disable-next-line no-var
  var Actual: Actual;
  // eslint-disable-next-line no-var
  var IS_TESTING: boolean;
}
