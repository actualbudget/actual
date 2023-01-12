let hasInitialized = false;

self.addEventListener('message', e => {
  if (!hasInitialized) {
    let msg = e.data;

    if (msg.type === 'init') {
      hasInitialized = true;
      let isDev = !!msg.isDev;
      let version = msg.version;
      let hash = msg.hash;

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
