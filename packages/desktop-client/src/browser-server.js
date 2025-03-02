/* globals importScripts, backend */
let hasInitialized = false;

/**
 * Sometimes the frontend build is way faster than backend.
 * This results in the frontend starting up before backend is
 * finished and thus the backend script is not available.
 *
 * The goal of this function is to retry X amount of times
 * to retrieve the backend script with a small delay.
 */
const importScriptsWithRetry = async (script, { maxRetries = 5 } = {}) => {
  try {
    importScripts(script);
  } catch (error) {
    // Break if maxRetries has exceeded
    if (maxRetries <= 0) {
      throw error;
    } else {
      console.groupCollapsed(
        `Failed to load backend, will retry ${maxRetries} more time(s)`,
      );
      console.log(error);
      console.groupEnd();
    }

    // Attempt to retry after a small delay
    await new Promise(resolve =>
      setTimeout(async () => {
        await importScriptsWithRetry(script, {
          maxRetries: maxRetries - 1,
        });
        resolve();
      }, 5000),
    );
  }
};

const RECONNECT_INTERVAL_MS = 200;
const MAX_RECONNECT_ATTEMPTS = 500;
let reconnectAttempts = 0;

const postMessageWithRetry = message => {
  const reconnectToClientInterval = setInterval(() => {
    self.postMessage(message);

    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      clearInterval(reconnectToClientInterval);
    }
  }, RECONNECT_INTERVAL_MS);

  return reconnectToClientInterval;
};

let appInitFailureInterval;
self.addEventListener('message', async event => {
  try {
    const msg = event.data;
    if (!hasInitialized) {
      if (msg.type === 'init') {
        hasInitialized = true;
        const isDev = !!msg.isDev;
        // let version = msg.version;
        const hash = msg.hash;

        if (
          !self.SharedArrayBuffer &&
          !msg.isSharedArrayBufferOverrideEnabled
        ) {
          appInitFailureInterval = postMessageWithRetry({
            type: 'app-init-failure',
            SharedArrayBufferMissing: true,
          });

          return;
        }

        await importScriptsWithRetry(
          `${msg.publicUrl}/kcab/kcab.worker.${hash}.js`,
          { maxRetries: isDev ? 5 : 0 },
        );

        backend.initApp(isDev, self).catch(err => {
          console.log(err);
          appInitFailureInterval = postMessageWithRetry({
            type: 'app-init-failure',
            IDBFailure: err.message.includes('indexeddb-failure'),
          });

          throw err;
        });
      }
    }

    if (msg.name === '__app-init-failure-acknowledged') {
      // Clear the interval if the client has acknowledged the failure, otherwise keep retrying
      clearInterval(appInitFailureInterval);
    }
  } catch (error) {
    console.log('Failed initializing backend:', error);
    appInitFailureInterval = postMessageWithRetry({
      type: 'app-init-failure',
      BackendInitFailure: true,
    });
  }
});
