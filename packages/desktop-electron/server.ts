import Module from 'module';

// @ts-strict-ignore
import fetch from 'node-fetch';

Module.globalPaths.push(__dirname + '/..');
global.fetch = fetch;

const _node = process.argv[0];
const _script = process.argv[1];
const _subProcess = process.argv[2];
const _actualVersion = process.argv[3];
const usingRelease = process.argv[4];

if (usingRelease) {
  console.info('usingRelease', usingRelease);
}

const serverProcessScript = usingRelease
  ? `${usingRelease}/loot-core/lib-dist/bundle.desktop.js`
  : `loot-core/lib-dist/bundle.desktop.js`; // read from global.json

const lazyLoadBackend = async (isDev: boolean) => {
  console.info('Lazy loading backend', serverProcessScript);
  const bundle = await import(serverProcessScript);
  bundle.initApp(isDev);
};

const isDev = false;

// Start the app
lazyLoadBackend(isDev);
