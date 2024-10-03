// @ts-strict-ignore
import fetch from 'node-fetch';

global.fetch = fetch;

const lazyLoadBackend = async (isDev: boolean) => {
  const bundle = await import(process.env.lootCoreScript);
  bundle.initApp(isDev);
};

const isDev = false;

// Start the app
lazyLoadBackend(isDev);
