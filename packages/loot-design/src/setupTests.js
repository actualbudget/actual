import { resetStore } from 'loot-core/src/mocks/redux';

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

// https://github.com/testing-library/react-testing-library#suppressing-unnecessary-warnings-on-react-dom-168
const originalError = console.error;
global.beforeAll(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

global.afterAll(() => {
  console.error = originalError;
});
