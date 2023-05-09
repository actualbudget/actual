export {};

declare global {
  interface Window {
    Actual?: {
      IS_FAKE_WEB: boolean;
      ACTUAL_VERSION: string;
      openURLInBrowser: (url: string) => void;
    };

    __history?: {
      location;
      push(url: string, opts?: unknown): void;
    };
  }
}
