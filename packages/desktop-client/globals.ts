import '@playwright/test';

// Allow images to be imported
declare module '*.png';

declare global {
  function __resetWorld(): void;

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Matchers<R> {
      toMatchThemeScreenshots(): Promise<R>;
    }
  }
}
