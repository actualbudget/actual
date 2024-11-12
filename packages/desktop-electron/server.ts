const lazyLoadBackend = async (isDev: boolean) => {
  if (process.env.lootCoreScript === undefined) {
    throw new Error(
      'The environment variable `lootCoreScript` is not defined. Please define it to point to the server bundle.',
    );
  }

  try {
    const bundle = await import(process.env.lootCoreScript);
    bundle.initApp(isDev);
  } catch (error) {
    console.error('Failed to init the server bundle:', error);
    throw new Error(`Failed to init the server bundle: ${error}`);
  }
};

const isDev = false;

// Start the app
lazyLoadBackend(isDev);
