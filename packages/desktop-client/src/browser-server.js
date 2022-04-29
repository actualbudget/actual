/* global globalThis */

import * as Sentry from '@sentry/browser';

let hasInitialized = false;

function installSentry(version) {
  Sentry.init({
    dsn: 'https://9e6094adfc9f43b5b5b9994cee44d7c2@sentry.io/5169928',
    release: version
  });

  globalThis.SentryClient = Sentry;
}

self.addEventListener('message', e => {
  if (!hasInitialized) {
    let msg = e.data;

    if (msg.type === 'init') {
      hasInitialized = true;
      let isDev = !!msg.isDev;
      let version = msg.version;
      let hash = msg.hash;

      if (!isDev) {
        installSentry(version);
      }

      // eslint-disable-next-line
      importScripts(`${process.env.PUBLIC_URL}/kcab/kcab.worker.${hash}.js`);

      // eslint-disable-next-line
      backend.initApp(version, isDev, self).then(
        () => {
          if (isDev) {
            console.log('Backend running!');
            self.postMessage({ type: '__actual:backend-running' });
          }
        },
        err => {
          console.log(err);
          let msg = {
            type: 'app-init-failure',
            IDBFailure: err.message.includes('indexeddb-failure')
          };
          self.postMessage(msg);

          throw err;
        }
      );
    }
  }
});
