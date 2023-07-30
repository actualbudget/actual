import { usePushModal } from '../../desktop-client/src/util/router-tools';

export {};

declare global {
  interface Window {
    Actual?: {
      IS_FAKE_WEB: boolean;
      ACTUAL_VERSION: string;
      openURLInBrowser: (url: string) => void;
      saveFile: (
        contents: Buffer,
        filename: string,
        dialogTitle: string,
      ) => void;
      openFileDialog: (
        opts: Parameters<import('electron').Dialog['showOpenDialogSync']>[0],
      ) => Promise<string[]>;
    };

    __navigate?: import('react-router').NavigateFunction;
    __pushModal?: ReturnType<typeof usePushModal>;
  }
}
