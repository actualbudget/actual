// @ts-strict-ignore
import fetch from 'node-fetch';

global.fetch = fetch;

const lazyLoadBackend = async (isDev: boolean) => {
  try {
    const bundle = await import(process.env.lootCoreScript);
    bundle.initApp(isDev);
  } catch (error) {
    console.error('Failed to init the server bundle:', error);
    throw new Error(`Failed to init the server bundle: ${error.message}`);
  }
};

const isDev = false;

// Start the app
lazyLoadBackend(isDev);
