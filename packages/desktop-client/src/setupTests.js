import '@testing-library/jest-dom';
import { installPolyfills } from './polyfills';
import { resetMockStore } from './redux/mock';

installPolyfills();

global.IS_TESTING = true;
global.Actual = {};

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: key => {
      return store[key] || null;
    },
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: key => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

vi.mock('react-virtualized-auto-sizer', () => ({
  default: props => {
    return props.children({ height: 1000, width: 600 });
  },
}));

global.Date.now = () => 123456789;

global.__resetWorld = () => {
  resetMockStore();
  localStorageMock.clear();
};

process.on('unhandledRejection', reason => {
  console.error('REJECTION', reason);
});

global.afterEach(() => {
  global.__resetWorld();
});
