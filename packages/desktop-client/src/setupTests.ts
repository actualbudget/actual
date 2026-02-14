import '@testing-library/jest-dom';
import type { ReactNode } from 'react';

import { resetTestProviders } from './mocks';
import { installPolyfills } from './polyfills';

installPolyfills();

global.IS_TESTING = true;
global.Actual = {} as typeof global.Actual;

type Size = { height: number; width: number };

type AutoSizerProps = {
  renderProp?: (size: Size) => ReactNode;
  children?: (size: Size) => ReactNode;
};

vi.mock('react-virtualized-auto-sizer', () => {
  const AutoSizer = (props: AutoSizerProps) => {
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
  resetTestProviders();
};

process.on('unhandledRejection', (reason: unknown) => {
  console.error('REJECTION', reason);
});

afterEach(() => {
  global.__resetWorld();
});
