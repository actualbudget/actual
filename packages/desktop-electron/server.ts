import promiseRetry from 'promise-retry';

const BACKEND_IMPORT_MAX_RETRIES = 30;

const lazyLoadBackend = async (isDev: boolean) => {
  if (process.env.lootCoreScript === undefined) {
    throw new Error(
      'The environment variable `lootCoreScript` is not defined. Please define it to point to the server bundle.',
    );
  }

  try {
    // These retries are primarily for dev mode, where we watch for changes in loot-core
    // In a packaged build this should always work the first time.
    const bundle = await promiseRetry(
      async (retry, number) => {
        try {
          return await import(process.env.lootCoreScript!);
        } catch (error) {
          console.info(
            `Loading server bundle: Attempt ${number} of ${BACKEND_IMPORT_MAX_RETRIES}`,
          );

          retry(error);
        }
      },
      {
        retries: BACKEND_IMPORT_MAX_RETRIES,
        minTimeout: 1000,
        maxTimeout: 1000,
        factor: 1, // No exponential backoff
      },
    );
    bundle.initApp(isDev);
  } catch (error) {
    console.error('Failed to init the server bundle after all retries:', error);
    throw new Error(
      `Failed to init the server bundle after all retries: ${error}`,
    );
  }
};

const isDev = false;

// Start the app
lazyLoadBackend(isDev);
