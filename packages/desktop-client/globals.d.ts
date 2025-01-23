// eslint-disable-next-line import/no-unresolved
import { type CSSObject } from '@emotion/css/dist/declarations/src/create-instance';

// Allow images to be imported
declare module '*.png';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CSSProperties extends CSSObject {}
}

declare global {
  function __resetWorld(): void;

  namespace PlaywrightTest {
    interface Matchers<R> {
      toMatchThemeScreenshots(): Promise<R>;
    }
  }
}
