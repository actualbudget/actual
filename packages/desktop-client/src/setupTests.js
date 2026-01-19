import '@testing-library/jest-dom';
import { installPolyfills } from './polyfills';
import { resetMockStore } from './redux/mock';

installPolyfills();

global.IS_TESTING = true;
global.Actual = {};

vi.mock('react-virtualized-auto-sizer', () => {
  const AutoSizer = props => {
    const render = props.renderProp ?? props.children;
    return render ? render({ height: 1000, width: 600 }) : null;
  };

  return {
    AutoSizer,
    default: AutoSizer,
  };
});

global.Date.now = () => 123456789;

global.__resetWorld = () => {
  resetMockStore();
};

process.on('unhandledRejection', reason => {
  console.error('REJECTION', reason);
});

global.afterEach(() => {
  global.__resetWorld();
});
