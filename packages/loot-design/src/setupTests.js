import { resetStore } from 'loot-core/src/mocks/redux';

const uuid = require('loot-core/src/platform/uuid');

global.IS_TESTING = true;
global.Actual = {};

jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }) =>
      children({ height: 1000, width: 600 })
);

// Why 2? There were already tests written assuming a specific
// transaction is negative, and 1 doesn't give me that data.
let seed = 2;
Math.random = function random() {
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

global.Date.now = () => 123456789;

uuid.v4 = function () {
  return Promise.resolve('testing-uuid-' + Math.floor(Math.random() * 1000000));
};

uuid.v4Sync = function () {
  return 'testing-uuid-' + Math.floor(Math.random() * 1000000);
};

global.__resetWorld = () => {
  seed = 2;
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
