import Module from 'module';

// @ts-strict-ignore
import fetch from 'node-fetch';

Module.globalPaths.push(__dirname + '/..');
global.fetch = fetch;

const lazyLoadBackend = async (isDev: boolean) => {
  console.info(
    'Lazy loading backend',
    process.env.ACTUAL_DATA_DIR +
      '/Releases/v23.9.0/loot-core/lib-dist/bundle.desktop.js',
  );
  const bundle = await import(
    process.env.ACTUAL_DATA_DIR +
      '/Releases/v23.9.0/loot-core/lib-dist/bundle.desktop.js'
  );
  bundle.initApp(isDev);
};

const isDev = false;

// Start the app
lazyLoadBackend(isDev);
