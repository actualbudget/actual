export {};

declare global {
  interface Window {
    Actual?: {
      IS_FAKE_WEB: boolean;
      ACTUAL_VERSION: string;
      openURLInBrowser: (url: string) => void;
      downloadActualServer: (releaseVersion: string) => Promise<void>;
      startActualServer: (releaseVersion: string) => Promise<void>;
      saveFile: (
        contents: string | Buffer,
        filename: string,
        dialogTitle: string,
      ) => void;
      openFileDialog: (
        opts: Parameters<import('electron').Dialog['showOpenDialogSync']>[0],
      ) => Promise<string[]>;
      relaunch: () => void;
      reload: (() => Promise<void>) | undefined;
      restartElectronServer: () => void;
      moveBudgetDirectory: (
        currentBudgetDirectory: string,
        newDirectory: string,
      ) => Promise<void>;
    };

    __navigate?: import('react-router').NavigateFunction;
  }
}
