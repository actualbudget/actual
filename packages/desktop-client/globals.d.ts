import { type CSSObject } from '@emotion/css/dist/declarations/src/create-instance';

import { type State } from './src/state';

// Allow images to be imported
declare module '*.png';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
  interface CSSProperties extends CSSObject {}
}

declare module 'react-redux' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/consistent-type-definitions
  interface DefaultRootState extends State {}
}
