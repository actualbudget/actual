/* globals importScripts, backend */
let hasInitialized = false;

self.addEventListener('message', e => {
  if (!hasInitialized) {
    let msg = e.data;

    if (msg.type === 'init') {
      hasInitialized = true;
      let isDev = !!msg.isDev;
      let version = msg.version;
      let hash = msg.hash;

      if (!self.SharedArrayBuffer && !msg.isSharedArrayBufferOverrideEnabled) {
        self.postMessage({
          type: 'app-init-failure',
          SharedArrayBufferMissing: true,
        });
        return;
      }

      importScripts(`${msg.publicUrl}/kcab/kcab.worker.${hash}.js`);

      backend.initApp(version, isDev, self).catch(err => {
        console.log(err);
        let msg = {
          type: 'app-init-failure',
          IDBFailure: err.message.includes('indexeddb-failure'),
        };
        self.postMessage(msg);

        throw err;
      });
    }
  }
});
