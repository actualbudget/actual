import Module from 'module';

// @ts-strict-ignore
import fetch from 'node-fetch';

import './setRequireHook';

Module.globalPaths.push(__dirname + '/..');
global.fetch = fetch;

const lazyLoadBackend = async (isDev: boolean) => {
  // eslint-disable-next-line import/extensions
  const bundle = await import('loot-core/lib-dist/bundle.desktop.js');
  const typedBundle: typeof bundle & { initApp: (isDev: boolean) => void } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bundle as unknown as any;

  typedBundle.initApp(isDev);
};

const isDev = false;

// Start the app
lazyLoadBackend(isDev);
