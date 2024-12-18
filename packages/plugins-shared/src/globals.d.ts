import { type CSSObject } from '@emotion/css/dist/declarations/src/create-instance';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CSSProperties extends CSSObject {}
}

export {};
