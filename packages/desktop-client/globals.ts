import '@playwright/test';

// Allow images to be imported
declare module '*.png';

declare global {
  function __resetWorld(): void;

  // oxlint-disable-next-line typescript/no-namespace
  namespace PlaywrightTest {
    // oxlint-disable-next-line typescript/consistent-type-definitions
    interface Matchers<R> {
      toMatchThemeScreenshots(): Promise<R>;
    }
  }
}
