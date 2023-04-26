export {};

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    Actual?: {
      IS_FAKE_WEB: boolean;
      ACTUAL_VERSION: string;
    };

    __history?: {
      location;
      push(url: string, opts?: unknown): void;
    };
  }
}
