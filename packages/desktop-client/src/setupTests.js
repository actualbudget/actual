import { resetStore } from 'loot-core/src/mocks/redux';

import installPolyfills from './polyfills';

installPolyfills();

global.IS_TESTING = true;
global.Actual = {};

jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }) =>
      children({ height: 1000, width: 600 }),
);

global.Date.now = () => 123456789;

global.__resetWorld = () => {
  resetStore();
};

process.on('unhandledRejection', reason => {
  console.log('REJECTION', reason);
});

global.afterEach(() => {
  global.__resetWorld();
});
