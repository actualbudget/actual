import { usePushModal } from '../../desktop-client/src/util/router-tools';

export {};

declare global {
  interface Window {
    Actual?: {
      IS_FAKE_WEB: boolean;
      ACTUAL_VERSION: string;
      openURLInBrowser: (url: string) => void;
    };

    __navigate?: import('react-router').NavigateFunction;
    __pushModal?: ReturnType<typeof usePushModal>;
  }
}
