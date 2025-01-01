import type { GlobalPrefs } from 'loot-core/types/prefs';

export {};

declare global {
  interface Window {
    Actual?: {
      IS_FAKE_WEB: boolean;
      ACTUAL_VERSION: string;
      openURLInBrowser: (url: string) => void;
      downloadActualServer: (releaseVersion: string) => Promise<void>;
      startActualServer: (releaseVersion: string) => Promise<void>;
      exposeActualServer: (
        settings: GlobalPrefs['ngrokConfig'],
      ) => Promise<{ url?: string; error?: string } | undefined>;
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
      startOAuthServer: () => Promise<string>;
      moveBudgetDirectory: (
        currentBudgetDirectory: string,
        newDirectory: string,
      ) => Promise<void>;
    };

    __navigate?: import('react-router').NavigateFunction;
  }
}
